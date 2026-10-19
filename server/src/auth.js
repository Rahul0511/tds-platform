// Authentication and authorization.
//
// * Passwords: scrypt with a random salt (node:crypto, no extra packages).
// * Sessions: random token in an httpOnly cookie; the database only keeps
//   its SHA-256, so a leaked database does not leak live sessions.
// * Roles are ordered viewer < editor < admin; requireRole('editor') lets
//   editors and admins through.

import crypto from 'node:crypto';
import { db, nowIso, tx } from './db.js';
import { ValidationError } from './products.js';

export const ROLES = ['viewer', 'editor', 'admin'];
/** Languages of the app's own pages. Separate from the TDS languages in i18n.js. */
export const UI_LANGUAGES = ['en', 'de', 'fr'];
export const SESSION_COOKIE = 'tds_session';

const SESSION_HOURS = 12;
const REMEMBER_DAYS = 14;
const MIN_PASSWORD = 10;
const MAX_FAILS = 5;
const LOCK_MS = 60_000;

// ---- Passwords ------------------------------------------------------------

const SCRYPT = { N: 16384, r: 8, p: 1 };

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64, SCRYPT);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export function verifyPassword(password, stored) {
  const [scheme, salt, hash] = String(stored).split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64');
  const actual = crypto.scryptSync(password, Buffer.from(salt, 'base64'), expected.length, SCRYPT);
  return crypto.timingSafeEqual(actual, expected);
}

/** Readable one-time password, e.g. "Kite-7342-Moss-Rain". */
export function generatePassword() {
  const words = ['Amber', 'Birch', 'Cedar', 'Delta', 'Ember', 'Fjord', 'Grove', 'Harbor', 'Indigo', 'Juniper', 'Kite', 'Lumen', 'Maple', 'Nova', 'Onyx', 'Pine', 'Quartz', 'Rain', 'Sage', 'Tide', 'Umber', 'Vale', 'Willow', 'Zephyr'];
  const pick = () => words[crypto.randomInt(words.length)];
  return `${pick()}-${crypto.randomInt(1000, 10000)}-${pick()}-${pick()}`;
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

const PUBLIC_FIELDS = 'id, username, display_name, email, role, must_change_password, active, created_at, last_login_at, ui_language';

const toPublic = (u) => u && { ...u, must_change_password: !!u.must_change_password, active: !!u.active };

export const listUsers = () => db.prepare(`SELECT ${PUBLIC_FIELDS} FROM users ORDER BY active DESC, display_name`).all().map(toPublic);
export const getUser = (id) => toPublic(db.prepare(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = ?`).get(id));

function activeAdminCount(exceptId = -1) {
  return db.prepare("SELECT COUNT(*) n FROM users WHERE role = 'admin' AND active = 1 AND id <> ?").get(exceptId).n;
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
  if (!partial || 'role' in input) {
    if (!ROLES.includes(input.role)) errors.role = `Role must be one of ${ROLES.join(', ')}`;
    out.role = input.role;
  }
  if ('active' in input) out.active = input.active ? 1 : 0;
  if (Object.keys(errors).length) throw new ValidationError(errors);
  return out;
}

/** Returns the new user and the one-time password to hand over. */
export function createUser(input, actor) {
  const data = validateUserFields(input);
  if (db.prepare('SELECT 1 FROM users WHERE username = ?').get(data.username)) {
    throw new ValidationError({ username: `User name "${data.username}" is taken` });
  }
  const tempPassword = generatePassword();
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO users (username, display_name, email, role, password_hash, must_change_password, active, created_at)
       VALUES (@username, @display_name, @email, @role, @hash, 1, 1, @now)`,
    )
    .run({ email: null, ...data, hash: hashPassword(tempPassword), now: nowIso() });
  audit(actor.username, 'user.created', data.username, `role ${data.role}`);
  return { user: getUser(lastInsertRowid), tempPassword };
}

export function updateUser(id, input, actor) {
  const data = validateUserFields(input, { partial: true });
  delete data.username; // user names are permanent: history refers to them
  return tx(() => {
    const before = getUser(id);
    if (!before) return null;
    const isSelf = before.id === actor.id;
    if (isSelf && data.role && data.role !== before.role) throw new ValidationError({ role: 'You cannot change your own role' });
    if (isSelf && data.active === 0) throw new ValidationError({ active: 'You cannot deactivate your own account' });
    const losesAdmin = before.role === 'admin' && before.active && ((data.role && data.role !== 'admin') || data.active === 0);
    if (losesAdmin && activeAdminCount(before.id) === 0) {
      throw new ValidationError({ role: 'At least one active admin is required' });
    }

    const sets = Object.keys(data).map((k) => `${k} = @${k}`);
    if (sets.length) db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = @id`).run({ ...data, id });
    if (data.active === 0) db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);

    const after = getUser(id);
    const changes = ['display_name', 'email', 'role', 'active']
      .filter((k) => k in data && String(before[k]) !== String(after[k]))
      .map((k) => `${k}: ${before[k]} → ${after[k]}`);
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
    if (user.role === 'admin' && user.active && activeAdminCount(user.id) === 0) {
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

/** First start: create an admin so somebody can log in. */
export function ensureInitialAdmin() {
  if (db.prepare('SELECT COUNT(*) n FROM users').get().n > 0) return null;
  const password = process.env.TDS_ADMIN_PASSWORD || generatePassword();
  db.prepare(
    `INSERT INTO users (username, display_name, role, password_hash, must_change_password, active, created_at)
     VALUES ('admin', 'Administrator', 'admin', ?, 1, 1, ?)`,
  ).run(hashPassword(password), nowIso());
  audit('system', 'user.created', 'admin', 'initial administrator');
  return { username: 'admin', password };
}

// ---- Sessions -------------------------------------------------------------

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
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
  const token = crypto.randomBytes(32).toString('base64url');
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
  audit(row.username, 'auth.login', row.username);
  return { token, maxAge: remember ? ms : undefined, user: getUser(row.id) };
}

export function logout(token) {
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
}

function userForToken(token) {
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

// ---- Express middleware -----------------------------------------------------

export function readSessionToken(req) {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === SESSION_COOKIE) return decodeURIComponent(v.join('='));
  }
  return null;
}

export function authenticate(req, _res, next) {
  req.sessionToken = readSessionToken(req);
  req.user = userForToken(req.sessionToken);
  next();
}

/** Any signed-in user. Users with a one-time password must change it first. */
export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Please sign in' });
  if (req.user.must_change_password) {
    return res.status(403).json({ error: 'Please set a new password first', code: 'PASSWORD_CHANGE_REQUIRED' });
  }
  next();
}

export function requireRole(minRole) {
  const min = ROLES.indexOf(minRole);
  return (req, res, next) =>
    requireAuth(req, res, () =>
      ROLES.indexOf(req.user.role) >= min ? next() : res.status(403).json({ error: `This needs the ${minRole} role` }),
    );
}

/** Blocks cross-site form posts: a state-changing request must come from this host. */
export function sameOriginOnly(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.get('Origin');
  if (origin) {
    try {
      if (new URL(origin).host !== req.get('Host')) return res.status(403).json({ error: 'Cross-site request blocked' });
    } catch {
      return res.status(403).json({ error: 'Cross-site request blocked' });
    }
  }
  next();
}

export function sessionCookie(token, maxAge, secure) {
  return [SESSION_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure, path: '/', ...(maxAge ? { maxAge } : {}) }];
}
