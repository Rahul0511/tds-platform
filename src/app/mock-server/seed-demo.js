// What a new demo database starts with: organisation, languages, phrases and
// lookups (seed-content.js), the templates (src/app/templates), the test
// products (test-data.js), demo accounts and a little history.
//
// Every demo account has the password "demo". The names are made up.

import { audit, getUser, hashPassword } from './auth.js';
import { db, nowIso, tx } from './db.js';
import { ensureLanguages, seedTranslations } from './i18n.js';
import { getProduct, updateProduct } from './products.js';
import { ensureDefaults } from './seed-content.js';
import { resetToTestData } from './test-data.js';

export const DEMO_PASSWORD = 'demo';

export const DEMO_USERS = [
  { username: 'admin', display_name: 'Alex Morgan', email: 'alex.morgan@example.com', is_admin: 1, access: [] },
  { username: 'nw.admin', display_name: 'Priya Sharma', email: 'priya.sharma@example.com', is_admin: 0, access: [{ region_code: '*', bu_code: 'NW', role: 'bu_admin' }] },
  {
    username: 'editor',
    display_name: 'Jonas Becker',
    email: 'jonas.becker@example.com',
    is_admin: 0,
    access: [
      { region_code: 'EMEA', bu_code: '*', role: 'editor' },
      { region_code: 'AMER', bu_code: 'NW', role: 'viewer' },
    ],
  },
  { username: 'sf.editor', display_name: 'Lena Hoffmann', email: 'lena.hoffmann@example.com', is_admin: 0, access: [{ region_code: 'EMEA', bu_code: 'SF', role: 'editor' }] },
  { username: 'viewer', display_name: 'Maria Rossi', email: 'maria.rossi@example.com', is_admin: 0, access: [{ region_code: '*', bu_code: '*', role: 'viewer' }] },
  // Shows the first sign-in: choose the app language and a new password.
  { username: 'new.user', display_name: 'Sam Taylor', email: 'sam.taylor@example.com', is_admin: 0, must_change_password: 1, access: [{ region_code: 'APAC', bu_code: '*', role: 'editor' }] },
  { username: 'former.user', display_name: 'Chris Walker', email: 'chris.walker@example.com', is_admin: 0, active: 0, access: [{ region_code: 'EMEA', bu_code: 'FP', role: 'editor' }] },
];

function addUsers() {
  const ins = db.prepare(
    `INSERT INTO users (username, display_name, email, is_admin, password_hash, must_change_password, active, created_at)
     VALUES (@username, @display_name, @email, @is_admin, @hash, @must_change_password, @active, @now)`,
  );
  const insAccess = db.prepare('INSERT INTO user_access (user_id, region_code, bu_code, role) VALUES (?, ?, ?, ?)');
  for (const u of DEMO_USERS) {
    const { lastInsertRowid } = ins.run({
      username: u.username,
      display_name: u.display_name,
      email: u.email,
      is_admin: u.is_admin,
      hash: hashPassword(DEMO_PASSWORD),
      must_change_password: u.must_change_password ?? 0,
      active: u.active ?? 1,
      now: nowIso(),
    });
    for (const a of u.access) insAccess.run(lastInsertRowid, a.region_code, a.bu_code, a.role);
    audit('system', 'user.created', u.username, 'demo account');
  }
}

const userNamed = (username) => getUser(db.prepare('SELECT id FROM users WHERE username = ?').get(username).id);
const productCoded = (code) => getProduct(db.prepare('SELECT id FROM products WHERE sales_code = ? AND region_code = ?').get(code, 'EMEA').id);

/** A few edits by demo users, so the history and dashboard have something to show. */
function addEdits() {
  const edit = (username, code, change, remark) => {
    const p = productCoded(code);
    updateProduct(p.id, { region_code: p.region_code, bu_code: p.bu_code, template_id: p.template_id, data: { ...p.data, ...change } }, userNamed(username), remark);
  };
  edit('editor', '99-100002-2', { shelf_life_months: 18 }, 'Shelf life extended after stability test');
  edit('sf.editor', '99-000002-2', { gloss: 3, solids: 29 }, 'Values from the new lab report');
  edit('nw.admin', '99-100005-5', { cof_static: 0.22 }, 'CoF re-measured');
}

/** Runs on every start: fills a new database, and brings templates and phrases up to date in an existing one. */
export function seedDemo() {
  ensureDefaults();
  ensureLanguages();
  if (!db.prepare('SELECT COUNT(*) n FROM users').get().n) {
    tx(() => {
      addUsers();
      resetToTestData();
      addEdits();
    });
  }
  seedTranslations();
}
