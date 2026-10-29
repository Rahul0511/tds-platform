// Authentication and authorization of the demo server (same rules as the
// v0.2 server, running in the browser).
//
// * Passwords: salted SHA-256. This is a demo without a backend; the data
//   lives in the browser, so nothing here is real security.
// * Sessions: random token kept by the browser (localStorage with "Keep me
//   signed in", else sessionStorage); the database keeps its SHA-256.
// * Microsoft single sign-on is simulated: ssoLogin() signs in a demo account
//   without a password. A real version redirects to Microsoft Entra ID.
// * Rights: system administrators (is_admin) may do everything; all other
//   rights are roles per region and business unit (org.js).

import { randomHex, randomInt, sha256 } from './hash.js';
import { ValidationError, db, nowIso, tx } from './db.js';
import { accessOf, canAnywhere, describeAccess, validateAccess } from './org.js';
/** Languages of the app's own pages. Separate from the TDS languages in i18n.js. */
export const UI_LANGUAGES = ['en', 'de', 'fr'];

const SESSION_HOURS = 12;
const REMEMBER_DAYS = 14;
const MIN_PASSWORD = 10;
const MAX_FAILS = 5;
const LOCK_MS = 60_000;

// ---- Passwords ------------------------------------------------------------

export function hashPassword(password) {
  const salt = randomHex(16);
  return `sha256$${salt}$${sha256(salt + password)}`;
}

export function verifyPassword(password, stored) {
  const [scheme, salt, hash] = String(stored).split('$');
  return scheme === 'sha256' && !!salt && sha256(salt + password) === hash;
}

/** Readable one-time password, e.g. "Kite-7342-Moss-Rain". */
export function generatePassword() {
  const words = ['Amber', 'Birch', 'Cedar', 'Delta', 'Ember', 'Fjord', 'Grove', 'Harbor', 'Indigo', 'Juniper', 'Kite', 'Lumen', 'Maple', 'Nova', 'Onyx', 'Pine', 'Quartz', 'Rain', 'Sage', 'Tide', 'Umber', 'Vale', 'Willow', 'Zephyr'];
  const pick = () => words[randomInt(words.length)];
  return `${pick()}-${randomInt(1000, 10000)}-${pick()}-${pick()}`;
}

function checkPasswordRules(password, user) {
  const p = String(password ?? '');
  if (p.length < MIN_PASSWORD) throw new ValidationError({ password: `Use at least ${MIN_PASSWORD} characters` });
  if (user && p.toLowerCase().includes(user.username.toLowerCase())) {
    throw new ValidationError({ password: 'The password must not contain the user name' });
  }
}

// ---- Audit ----------------------------------------------------------------

export function audit(actor, action, target = null, detail = null) {
  db.prepare('INSERT INTO audit_log (at, actor, action, target, detail) VALUES (?, ?, ?, ?, ?)').run(nowIso(), actor, action, target, detail);
}

/** One page of the security log, newest first, with the total for pagination. */
export function recentAudit({ limit = 50, offset = 0 } = {}) {
  return {
    items: db.prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT ? OFFSET ?').all(limit, offset),
    total: db.prepare('SELECT COUNT(*) n FROM audit_log').get().n,
  };
}

// ---- Users ----------------------------------------------------------------

const PUBLIC_FIELDS = 'id, username, display_name, email, is_admin, must_change_password, active, created_at, last_login_at, ui_language';

const toPublic = (u) =>
  u && { ...u, is_admin: !!u.is_admin, must_change_password: !!u.must_change_password, active: !!u.active, access: accessOf(u.id) };

export const listUsers = () => db.prepare(`SELECT ${PUBLIC_FIELDS} FROM users ORDER BY active DESC, display_name`).all().map(toPublic);
export const getUser = (id) => toPublic(db.prepare(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = ?`).get(id));

function activeAdminCount(exceptId = -1) {
  return db.prepare('SELECT COUNT(*) n FROM users WHERE is_admin = 1 AND active = 1 AND id <> ?').get(exceptId).n;
}

function validateUserFields(input, { partial = false } = {}) {
  const errors = {};
  const out = {};
  if (!partial || 'username' in input) {
    const u = String(input.username ?? '').trim();
    if (!/^[a-zA-Z0-9._-]{3,40}$/.test(u)) errors.username = '3–40 characters: letters, digits, dot, dash or underscore';
    out.username = u;
  }
  if (!partial || 'display_name' in input) {
    const n = String(input.display_name ?? '').trim();
    if (!n) errors.display_name = 'Name is required';
    out.display_name = n;
  }
  if ('email' in input) {
    const e = String(input.email ?? '').trim();
    if (e && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) errors.email = 'Not a valid e-mail address';
    out.email = e || null;
  }
  if ('is_admin' in input) out.is_admin = input.is_admin ? 1 : 0;
  if ('active' in input) out.active = input.active ? 1 : 0;
  if (Object.keys(errors).length) throw new ValidationError(errors);
  return out;
}

function saveAccess(userId, access) {
  db.prepare('DELETE FROM user_access WHERE user_id = ?').run(userId);
  const ins = db.prepare('INSERT INTO user_access (user_id, region_code, bu_code, role) VALUES (?, ?, ?, ?)');
  for (const a of access) ins.run(userId, a.region_code, a.bu_code, a.role);
}

/** Returns the new user and the one-time password to hand over. */
export function createUser(input, actor) {
  const data = validateUserFields(input);
  const access = validateAccess(input.access ?? []);
  if (!data.is_admin && !access.length) throw new ValidationError({ access: 'Give the user access to at least one region and business unit' });
  if (db.prepare('SELECT 1 FROM users WHERE username = ?').get(data.username)) {
    throw new ValidationError({ username: `User name "${data.username}" is taken` });
  }
  const tempPassword = generatePassword();
  const id = tx(() => {
    const { lastInsertRowid } = db
      .prepare(
        `INSERT INTO users (username, display_name, email, is_admin, password_hash, must_change_password, active, created_at)
         VALUES (@username, @display_name, @email, @is_admin, @hash, 1, 1, @now)`,
      )
      .run({ email: null, is_admin: 0, ...data, hash: hashPassword(tempPassword), now: nowIso() });
    saveAccess(lastInsertRowid, access);
    return lastInsertRowid;
  });
  audit(actor.username, 'user.created', data.username, `${data.is_admin ? 'system admin; ' : ''}access: ${describeAccess(access)}`);
  return { user: getUser(id), tempPassword };
}

export function updateUser(id, input, actor) {
  const data = validateUserFields(input, { partial: true });
  delete data.username; // user names are permanent: history refers to them
  const access = 'access' in input ? validateAccess(input.access ?? []) : null;
  return tx(() => {
    const before = getUser(id);
    if (!before) return null;
    const isSelf = before.id === actor.id;
    if (isSelf && 'is_admin' in data && !!data.is_admin !== before.is_admin) throw new ValidationError({ is_admin: 'You cannot change your own administrator rights' });
    if (isSelf && access && describeAccess(access) !== describeAccess(before.access)) throw new ValidationError({ access: 'You cannot change your own access' });
    if (isSelf && data.active === 0) throw new ValidationError({ active: 'You cannot deactivate your own account' });
    const losesAdmin = before.is_admin && before.active && (data.is_admin === 0 || data.active === 0);
    if (losesAdmin && activeAdminCount(before.id) === 0) {
      throw new ValidationError({ is_admin: 'At least one active admin is required' });
    }
    const isAdmin = 'is_admin' in data ? !!data.is_admin : before.is_admin;
    if (!isAdmin && (access ?? before.access).length === 0) {
      throw new ValidationError({ access: 'Give the user access to at least one region and business unit' });
    }

    const sets = Object.keys(data).map((k) => `${k} = @${k}`);
    if (sets.length) db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = @id`).run({ ...data, id });
    if (access) saveAccess(id, access);
    if (data.active === 0) db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);

    const after = getUser(id);
    const changes = ['display_name', 'email', 'is_admin', 'active']
      .filter((k) => k in data && String(before[k]) !== String(after[k]))
      .map((k) => `${k}: ${before[k]} → ${after[k]}`);
    if (access && describeAccess(before.access) !== describeAccess(after.access)) {
      changes.push(`access: ${describeAccess(before.access)} → ${describeAccess(after.access)}`);
    }
    if (changes.length) audit(actor.username, 'user.updated', before.username, changes.join(', '));
    return after;
  });
}

export function resetPassword(id, actor) {
  const user = getUser(id);
  if (!user) return null;
  const tempPassword = generatePassword();
  tx(() => {
    db.prepare('UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?').run(hashPassword(tempPassword), id);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
  });
  audit(actor.username, 'user.password_reset', user.username);
  return { user: getUser(id), tempPassword };
}

export function deleteUser(id, actor) {
  return tx(() => {
    const user = getUser(id);
    if (!user) return false;
    if (user.id === actor.id) throw new ValidationError({ user: 'You cannot delete your own account' });
    if (user.is_admin && user.active && activeAdminCount(user.id) === 0) {
      throw new ValidationError({ user: 'At least one active admin is required' });
    }
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    audit(actor.username, 'user.deleted', user.username);
    return true;
  });
}

function checkUiLanguage(lang) {
  if (!UI_LANGUAGES.includes(lang)) throw new ValidationError({ ui_language: `Language must be one of ${UI_LANGUAGES.join(', ')}` });
  return lang;
}

/** The language the app is shown in for this user. */
export function setUiLanguage(user, lang) {
  db.prepare('UPDATE users SET ui_language = ? WHERE id = ?').run(checkUiLanguage(lang), user.id);
  return getUser(user.id);
}

/** uiLanguage (optional) is chosen on the first sign-in, together with the new password. */
export function changeOwnPassword(user, current, next, currentToken, uiLanguage) {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  if (!row || !verifyPassword(String(current ?? ''), row.password_hash)) {
    throw new ValidationError({ current: 'Current password is not correct' });
  }
  checkPasswordRules(next, row);
  if (verifyPassword(String(next), row.password_hash)) throw new ValidationError({ password: 'Choose a password different from the current one' });
  if (uiLanguage !== undefined) checkUiLanguage(uiLanguage);
  tx(() => {
    db.prepare('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?').run(hashPassword(String(next)), user.id);
    if (uiLanguage !== undefined) db.prepare('UPDATE users SET ui_language = ? WHERE id = ?').run(uiLanguage, user.id);
    // Sign out every other session of this user.
    db.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?').run(user.id, sha256(currentToken ?? ''));
  });
  audit(user.username, 'user.password_changed', user.username);
  return getUser(user.id);
}

// ---- Sessions -------------------------------------------------------------

const failures = new Map(); // username -> { count, lockedUntil }

export function login(username, password, remember) {
  const key = String(username ?? '').trim().toLowerCase();
  const f = failures.get(key);
  if (f?.lockedUntil > Date.now()) {
    const s = Math.ceil((f.lockedUntil - Date.now()) / 1000);
    return { error: `Too many attempts. Try again in ${s} s.`, status: 429 };
  }

  const row = db.prepare('SELECT * FROM users WHERE username = ?').get(key);
  // Hash even when the user is unknown, so timing does not reveal valid names.
  const ok = row ? verifyPassword(String(password ?? ''), row.password_hash) : (verifyPassword('x', hashPassword('y')), false);

  if (!ok || !row.active) {
    const count = (f?.count ?? 0) + 1;
    failures.set(key, { count, lockedUntil: count >= MAX_FAILS ? Date.now() + LOCK_MS : 0 });
    if (row) audit(row.username, 'auth.login_failed', row.username, row.active ? null : 'inactive account');
    return { error: 'User name or password is incorrect', status: 401 };
  }

  failures.delete(key);
  return startSession(row, remember, null);
}

/** Demo Microsoft single sign-on: signs in an active account by user name, without a password. */
export function ssoLogin(username) {
  const row = db.prepare('SELECT * FROM users WHERE username = ?').get(String(username ?? '').trim().toLowerCase());
  if (!row || !row.active) return { error: 'This Microsoft account has no access to the TDS Platform', status: 403 };
  return startSession(row, true, 'Microsoft single sign-on (demo)');
}

function startSession(row, remember, how) {
  const token = randomHex(32);
  const ms = remember ? REMEMBER_DAYS * 864e5 : SESSION_HOURS * 36e5;
  const now = nowIso();
  db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(
    sha256(token),
    row.id,
    now,
    new Date(Date.now() + ms).toISOString(),
  );
  db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(now, row.id);
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now);
  audit(row.username, 'auth.login', row.username, how);
  return { token, remember, user: getUser(row.id) };
}

export function logout(token) {
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
}

export function userForToken(token) {
  if (!token) return null;
  return toPublic(
    db
      .prepare(
        `SELECT ${PUBLIC_FIELDS.split(', ').map((c) => 'u.' + c).join(', ')}
         FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = ? AND s.expires_at > ? AND u.active = 1`,
      )
      .get(sha256(token), nowIso()),
  );
}
