// Regions, business units and who may do what where.
//
// A user's rights come from assignments (region, business unit, role) in
// user_access; '*' stands for every region or every business unit. Roles are
// ordered: viewer < editor < bu_admin. System administrators (users.is_admin)
// may do everything everywhere.
//
//   viewer    view products and history, preview and download TDS
//   editor    + create, edit and delete products, translate their texts
//   bu_admin  + templates, phrases, lookups and the company line of the business unit

import { ForbiddenError, ValidationError, db, nowIso, tx } from './db.js';

export const SCOPE_ROLES = ['viewer', 'editor', 'bu_admin'];
export const ALL = '*';

const rank = (role) => SCOPE_ROLES.indexOf(role);

export const DEFAULT_REGIONS = [
  { code: 'EMEA', name: 'Europe, Middle East & Africa' },
  { code: 'AMER', name: 'Americas' },
  { code: 'APAC', name: 'Asia Pacific' },
];

export const DEFAULT_BUSINESS_UNITS = [
  { code: 'NW', name: 'Narrow Web' },
  { code: 'SF', name: 'Sheetfed' },
  { code: 'FP', name: 'Flexible Packaging' },
];

// ---- Regions and business units --------------------------------------------

const toOrg = (r) => ({ ...r, active: !!r.active });

export const listRegions = () => db.prepare('SELECT * FROM regions ORDER BY sort_order, code').all().map(toOrg);
export const listBusinessUnits = () => db.prepare('SELECT * FROM business_units ORDER BY sort_order, code').all().map(toOrg);

const TABLE = { region: 'regions', bu: 'business_units' };
const COLUMN = { region: 'region_code', bu: 'bu_code' };

export function orgExists(kind, code) {
  return !!db.prepare(`SELECT 1 FROM ${TABLE[kind]} WHERE code = ?`).get(code);
}

export function addOrgUnit(kind, { code, name }) {
  const c = String(code ?? '').trim().toUpperCase();
  const n = String(name ?? '').trim();
  if (!/^[A-Z][A-Z0-9]{1,9}$/.test(c)) throw new ValidationError({ code: 'Use 2–10 capital letters or digits, starting with a letter' });
  if (!n) throw new ValidationError({ name: 'Name is required' });
  if (orgExists(kind, c)) throw new ValidationError({ code: `${c} already exists` });
  const max = db.prepare(`SELECT COALESCE(MAX(sort_order), 0) m FROM ${TABLE[kind]}`).get().m;
  db.prepare(`INSERT INTO ${TABLE[kind]} (code, name, active, sort_order) VALUES (?, ?, 1, ?)`).run(c, n, max + 10);
  return toOrg(db.prepare(`SELECT * FROM ${TABLE[kind]} WHERE code = ?`).get(c));
}

export function updateOrgUnit(kind, code, { name, active }) {
  if (!orgExists(kind, code)) return null;
  if (name !== undefined && !String(name).trim()) throw new ValidationError({ name: 'Name is required' });
  db.prepare(`UPDATE ${TABLE[kind]} SET name = COALESCE(?, name), active = COALESCE(?, active) WHERE code = ?`).run(
    name === undefined ? null : String(name).trim(),
    active === undefined ? null : active ? 1 : 0,
    code,
  );
  return toOrg(db.prepare(`SELECT * FROM ${TABLE[kind]} WHERE code = ?`).get(code));
}

/** Only an unused region or business unit can be deleted; otherwise switch it off. */
export function deleteOrgUnit(kind, code) {
  if (!orgExists(kind, code)) return false;
  const col = COLUMN[kind];
  const used =
    db.prepare(`SELECT COUNT(*) n FROM products WHERE ${col} = ?`).get(code).n +
    db.prepare(`SELECT COUNT(*) n FROM templates WHERE ${col} = ?`).get(code).n;
  if (used) throw new ValidationError({ code: `${code} is still used by products or templates. Switch it off instead.` });
  tx(() => {
    db.prepare(`DELETE FROM user_access WHERE ${col} = ?`).run(code);
    db.prepare(`DELETE FROM scope_settings WHERE ${col} = ?`).run(code);
    if (kind === 'bu') db.prepare('UPDATE phrases SET bu_code = NULL WHERE bu_code = ?').run(code);
    db.prepare(`DELETE FROM ${TABLE[kind]} WHERE code = ?`).run(code);
  });
  return true;
}

export function ensureOrg() {
  const insR = db.prepare('INSERT OR IGNORE INTO regions (code, name, active, sort_order) VALUES (?, ?, 1, ?)');
  const insB = db.prepare('INSERT OR IGNORE INTO business_units (code, name, active, sort_order) VALUES (?, ?, 1, ?)');
  // Only for a new database: a deleted region or business unit is not brought back.
  if (!db.prepare('SELECT COUNT(*) n FROM regions').get().n) DEFAULT_REGIONS.forEach((r, i) => insR.run(r.code, r.name, (i + 1) * 10));
  if (!db.prepare('SELECT COUNT(*) n FROM business_units').get().n) DEFAULT_BUSINESS_UNITS.forEach((b, i) => insB.run(b.code, b.name, (i + 1) * 10));
}

// ---- Access ----------------------------------------------------------------------

export const accessOf = (userId) =>
  db.prepare('SELECT region_code, bu_code, role FROM user_access WHERE user_id = ? ORDER BY region_code, bu_code').all(userId);

const covers = (a, region, bu) => (a.region_code === ALL || a.region_code === region) && (a.bu_code === ALL || a.bu_code === bu);

/**
 * The user's role in a region and business unit, or null. Pass ALL as region
 * or bu to ask for every region / business unit at once: only an assignment
 * for '*' covers that.
 */
export function roleIn(user, region, bu) {
  if (!user) return null;
  if (user.is_admin) return 'bu_admin';
  let best = null;
  for (const a of user.access ?? []) if (covers(a, region, bu) && rank(a.role) > rank(best)) best = a.role;
  return best;
}

export const can = (user, minRole, region, bu) => rank(roleIn(user, region, bu)) >= rank(minRole);

/** Has the role somewhere (for menus and coarse checks). */
export const canAnywhere = (user, minRole) => !!user && (user.is_admin || (user.access ?? []).some((a) => rank(a.role) >= rank(minRole)));

export function assertCan(user, minRole, region, bu) {
  if (!can(user, minRole, region, bu)) throw new ForbiddenError(`This needs the ${minRole} role for ${region === ALL ? 'all regions' : region} · ${bu === ALL ? 'all business units' : bu}`);
}

/** Business units in which the user has at least this role in some region. */
export function busWith(user, minRole) {
  const all = listBusinessUnits().map((b) => b.code);
  if (user?.is_admin) return all;
  const out = new Set();
  for (const a of user?.access ?? []) if (rank(a.role) >= rank(minRole)) (a.bu_code === ALL ? all : [a.bu_code]).forEach((b) => out.add(b));
  return [...out];
}

/**
 * SQL condition limiting rows to the scopes where the user has at least this
 * role. The table must have region_code and bu_code columns.
 */
export function scopeFilter(user, minRole, alias = '') {
  const p = alias ? `${alias}.` : '';
  if (user?.is_admin) return { sql: '1 = 1', params: [] };
  const parts = [];
  const params = [];
  for (const a of user?.access ?? []) {
    if (rank(a.role) < rank(minRole)) continue;
    const conds = [];
    if (a.region_code !== ALL) {
      conds.push(`${p}region_code = ?`);
      params.push(a.region_code);
    }
    if (a.bu_code !== ALL) {
      conds.push(`${p}bu_code = ?`);
      params.push(a.bu_code);
    }
    parts.push(conds.length ? `(${conds.join(' AND ')})` : '1 = 1');
  }
  return { sql: parts.length ? `(${parts.join(' OR ')})` : '0 = 1', params };
}

/** Checks and normalises a list of assignments from the users page. */
export function validateAccess(list) {
  if (!Array.isArray(list)) throw new ValidationError({ access: 'Access must be a list' });
  const regions = new Set([ALL, ...listRegions().map((r) => r.code)]);
  const bus = new Set([ALL, ...listBusinessUnits().map((b) => b.code)]);
  const seen = new Set();
  return list.map((a) => {
    const out = { region_code: String(a?.region_code ?? ''), bu_code: String(a?.bu_code ?? ''), role: String(a?.role ?? '') };
    if (!regions.has(out.region_code)) throw new ValidationError({ access: `Unknown region "${out.region_code}"` });
    if (!bus.has(out.bu_code)) throw new ValidationError({ access: `Unknown business unit "${out.bu_code}"` });
    if (!SCOPE_ROLES.includes(out.role)) throw new ValidationError({ access: `Role must be one of ${SCOPE_ROLES.join(', ')}` });
    const key = `${out.region_code}|${out.bu_code}`;
    if (seen.has(key)) throw new ValidationError({ access: `${out.region_code} · ${out.bu_code} is listed twice` });
    seen.add(key);
    return out;
  });
}

export const describeAccess = (list) =>
  list.length ? list.map((a) => `${a.region_code === ALL ? 'all regions' : a.region_code}/${a.bu_code === ALL ? 'all BUs' : a.bu_code} ${a.role}`).join(', ') : 'none';

// ---- Values per region and business unit ------------------------------------------

/** company_line: the company and address printed in the TDS footer. */
export const SCOPE_SETTING_KEYS = ['company_line'];

export function scopeSettings() {
  return db.prepare('SELECT * FROM scope_settings ORDER BY region_code, bu_code, key').all();
}

export function setScopeSetting(region, bu, key, value, user) {
  if (!SCOPE_SETTING_KEYS.includes(key)) throw new ValidationError({ key: `Unknown setting "${key}"` });
  if (!orgExists('region', region)) throw new ValidationError({ region_code: `Unknown region "${region}"` });
  if (!orgExists('bu', bu)) throw new ValidationError({ bu_code: `Unknown business unit "${bu}"` });
  assertCan(user, 'bu_admin', region, bu);
  const v = String(value ?? '').trim();
  if (v) {
    db.prepare(
      'INSERT INTO scope_settings (region_code, bu_code, key, value) VALUES (?, ?, ?, ?) ON CONFLICT(region_code, bu_code, key) DO UPDATE SET value = excluded.value',
    ).run(region, bu, key, v);
  } else {
    db.prepare('DELETE FROM scope_settings WHERE region_code = ? AND bu_code = ? AND key = ?').run(region, bu, key);
  }
  return { region_code: region, bu_code: bu, key, value: v, updated_at: nowIso() };
}
