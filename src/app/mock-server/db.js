// The demo database: the schema of the v0.2 server, in SQLite running in
// the browser (sqlite.js). `db` is set by initDb() before the first request.

import { openDatabase } from './sqlite.js';

/** @type {import('./sqlite.js').Database} */
export let db;

const SCHEMA = `
  -- Organisation. Every product belongs to one region and one business unit;
  -- access is granted per region and business unit (see user_access).
  CREATE TABLE IF NOT EXISTS regions (
    code        TEXT PRIMARY KEY,
    name        TEXT    NOT NULL,
    active      INTEGER NOT NULL DEFAULT 1,
    sort_order  INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS business_units (
    code        TEXT PRIMARY KEY,
    name        TEXT    NOT NULL,
    active      INTEGER NOT NULL DEFAULT 1,
    sort_order  INTEGER NOT NULL DEFAULT 0
  );

  -- Values per region and business unit, e.g. the company line in the footer.
  CREATE TABLE IF NOT EXISTS scope_settings (
    region_code TEXT NOT NULL,
    bu_code     TEXT NOT NULL,
    key         TEXT NOT NULL,
    value       TEXT NOT NULL,
    PRIMARY KEY (region_code, bu_code, key)
  );

  -- Phrase library: standard texts, written once and used by any template.
  -- bu_code NULL = shared by every business unit.
  CREATE TABLE IF NOT EXISTS phrases (
    key         TEXT PRIMARY KEY,
    bu_code     TEXT REFERENCES business_units(code),
    title       TEXT NOT NULL,
    body        TEXT NOT NULL,
    updated_at  TEXT,
    updated_by  TEXT
  );

  -- TDS templates: which blocks, in which order (JSON, see templates.js).
  -- Each business unit has its own; region_code NULL = for every region.
  CREATE TABLE IF NOT EXISTS templates (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    code        TEXT    NOT NULL UNIQUE,
    bu_code     TEXT    NOT NULL REFERENCES business_units(code),
    region_code TEXT    REFERENCES regions(code),
    name        TEXT    NOT NULL,
    description TEXT,
    definition  TEXT    NOT NULL,
    active      INTEGER NOT NULL DEFAULT 1,
    version     INTEGER NOT NULL DEFAULT 1,
    updated_at  TEXT    NOT NULL,
    updated_by  TEXT
  );

  -- Controlled drop-down values.
  CREATE TABLE IF NOT EXISTS lookups (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    category   TEXT    NOT NULL,
    value      TEXT    NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    UNIQUE (category, value)
  );

  -- One row per product = one TDS. Every field value is in data (JSON, keys
  -- from fields.js); code, name and type are repeated as columns for search.
  CREATE TABLE IF NOT EXISTS products (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    region_code  TEXT    NOT NULL REFERENCES regions(code),
    bu_code      TEXT    NOT NULL REFERENCES business_units(code),
    template_id  INTEGER NOT NULL REFERENCES templates(id),
    sales_code   TEXT,
    name         TEXT    NOT NULL,
    product_type TEXT,
    data         TEXT    NOT NULL DEFAULT '{}',
    version      INTEGER NOT NULL DEFAULT 1,
    modified_at  TEXT    NOT NULL,
    modified_by  TEXT,
    remarks      TEXT
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_products_code ON products(region_code, sales_code) WHERE sales_code IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_products_scope ON products(bu_code, region_code);

  -- Who changed what and when.
  CREATE TABLE IF NOT EXISTS product_history (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id  INTEGER,
    region_code TEXT    NOT NULL,
    bu_code     TEXT    NOT NULL,
    sales_code  TEXT,
    name        TEXT    NOT NULL,
    version     INTEGER NOT NULL,
    action      TEXT    NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'imported')),
    changed_by  TEXT,
    changed_at  TEXT    NOT NULL,
    remark      TEXT,
    changes     TEXT,   -- JSON: { field: [old, new] }
    snapshot    TEXT    -- JSON: full product after the change
  );
  CREATE INDEX IF NOT EXISTS idx_history_product ON product_history(product_id, id DESC);

  -- App-wide values (e.g. which starter translations were added).
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  -- Accounts. is_admin = system administrator (users, regions, business
  -- units, languages); everything else comes from user_access.
  CREATE TABLE IF NOT EXISTS users (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    username             TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    display_name         TEXT    NOT NULL,
    email                TEXT,
    is_admin             INTEGER NOT NULL DEFAULT 0,
    password_hash        TEXT    NOT NULL,
    must_change_password INTEGER NOT NULL DEFAULT 1,
    active               INTEGER NOT NULL DEFAULT 1,
    created_at           TEXT    NOT NULL,
    last_login_at        TEXT,
    ui_language          TEXT    -- language of the app's own pages (en, de, fr); NULL = not chosen yet
  );

  -- Role of a user in a region and business unit. '*' = every region or
  -- every business unit. Roles: viewer < editor < bu_admin.
  CREATE TABLE IF NOT EXISTS user_access (
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    region_code TEXT    NOT NULL,
    bu_code     TEXT    NOT NULL,
    role        TEXT    NOT NULL CHECK (role IN ('viewer', 'editor', 'bu_admin')),
    PRIMARY KEY (user_id, region_code, bu_code)
  );

  -- Login sessions. Only a SHA-256 of the cookie token is stored.
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash  TEXT PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TEXT    NOT NULL,
    expires_at  TEXT    NOT NULL
  );

  -- TDS languages. EN is the base language the content is written in.
  CREATE TABLE IF NOT EXISTS languages (
    code        TEXT PRIMARY KEY,
    name        TEXT    NOT NULL,
    active      INTEGER NOT NULL DEFAULT 1,
    sort_order  INTEGER NOT NULL DEFAULT 0
  );

  -- One translated text per (scope, ref, language). scope says what kind of
  -- text it is (label, phrase, template, product.field ...), ref which one.
  -- source_hash is the English text it was translated from, so a later
  -- change of the English text marks the translation as outdated.
  CREATE TABLE IF NOT EXISTS translations (
    scope        TEXT NOT NULL,
    ref          TEXT NOT NULL,
    lang         TEXT NOT NULL REFERENCES languages(code) ON DELETE CASCADE ON UPDATE CASCADE,
    text         TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('suggested', 'approved')),
    source_hash  TEXT NOT NULL,
    updated_at   TEXT NOT NULL,
    updated_by   TEXT,
    PRIMARY KEY (scope, ref, lang)
  );

  -- Security-relevant events: logins, user, access and template changes.
  CREATE TABLE IF NOT EXISTS audit_log (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    at      TEXT NOT NULL,
    actor   TEXT,
    action  TEXT NOT NULL,
    target  TEXT,
    detail  TEXT
  );
`;

export async function initDb() {
  db = await openDatabase();
  db.raw.exec('PRAGMA foreign_keys = ON');
  db.raw.exec(SCHEMA);
}

export const nowIso = () => new Date().toISOString();

export function tx(fn) {
  return db.transaction(fn)();
}

export class ValidationError extends Error {
  constructor(errors) {
    super('Validation failed');
    this.errors = errors;
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'You do not have access to this region and business unit') {
    super(message);
  }
}
