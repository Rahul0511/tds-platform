import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = path.resolve(here, '..', 'data');
export const DB_PATH = process.env.TDS_DB_PATH || path.join(DATA_DIR, 'tds.db');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  -- One row per product = one TDS. Replaces the "Masterdata" sheet.
  CREATE TABLE IF NOT EXISTS products (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    sales_code        TEXT    NOT NULL UNIQUE,
    designation       TEXT    NOT NULL,
    header            TEXT    NOT NULL REFERENCES headers(code) ON UPDATE CASCADE,
    description       TEXT,
    substrate         TEXT,
    -- Rating scales: 1-10 dots on the TDS, NULL = n.a.
    gloss             INTEGER,
    rub               INTEGER,
    blocking          INTEGER,
    drying            INTEGER,
    cof               INTEGER,
    hot_foil          INTEGER,
    foil_lamination   INTEGER,
    uv_coating        INTEGER,
    gluability        INTEGER,
    -- Physical / technical data
    viscosity         TEXT,
    density           REAL,
    solids            REAL,
    ph                TEXT,
    double_sided      TEXT,
    heat_resistance   TEXT,
    foil_wrapping     TEXT,
    deep_freezing     TEXT,
    shelf_life_months INTEGER,
    -- Versioning
    version           INTEGER NOT NULL DEFAULT 1,
    modified_at       TEXT    NOT NULL,
    modified_by       TEXT,
    remarks           TEXT
  );

  -- The "Header" drop-down (NPH / DFC ...) steers intended use and compliance text.
  CREATE TABLE IF NOT EXISTS headers (
    code          TEXT PRIMARY KEY,
    intended_use  TEXT NOT NULL DEFAULT '',
    compliance    TEXT NOT NULL DEFAULT ''
  );

  -- Controlled drop-down values. Replaces the "Dropdown_EN" sheet.
  CREATE TABLE IF NOT EXISTS lookups (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    category   TEXT    NOT NULL,
    value      TEXT    NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    UNIQUE (category, value)
  );

  -- Fixed TDS text segments (processing advice, storage, legal ...).
  CREATE TABLE IF NOT EXISTS text_blocks (
    key         TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    body        TEXT NOT NULL,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    updated_at  TEXT,
    updated_by  TEXT
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  -- Who changed what and when. The Excel tool had no history at all.
  CREATE TABLE IF NOT EXISTS product_history (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id  INTEGER,
    sales_code  TEXT    NOT NULL,
    version     INTEGER NOT NULL,
    action      TEXT    NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'imported')),
    changed_by  TEXT,
    changed_at  TEXT    NOT NULL,
    remark      TEXT,
    changes     TEXT,   -- JSON: { field: [old, new] }
    snapshot    TEXT    -- JSON: full product row after the change
  );
  CREATE INDEX IF NOT EXISTS idx_history_product ON product_history(product_id, id DESC);

  -- Accounts. Roles: viewer (read + export), editor (+ change data), admin (+ users, settings).
  CREATE TABLE IF NOT EXISTS users (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    username             TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    display_name         TEXT    NOT NULL,
    email                TEXT,
    role                 TEXT    NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
    password_hash        TEXT    NOT NULL,
    must_change_password INTEGER NOT NULL DEFAULT 1,
    active               INTEGER NOT NULL DEFAULT 1,
    created_at           TEXT    NOT NULL,
    last_login_at        TEXT,
    ui_language          TEXT    -- language of the app's own pages (en, de, fr); NULL = not chosen yet
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
  -- text it is (label, block.body, lookup ...), ref which one. source_hash is
  -- the English text it was translated from, so a later change of the English
  -- text marks the translation as outdated.
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

  -- Security-relevant events: logins, user and role changes.
  CREATE TABLE IF NOT EXISTS audit_log (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    at      TEXT NOT NULL,
    actor   TEXT,
    action  TEXT NOT NULL,
    target  TEXT,
    detail  TEXT
  );
`);

// Columns added after the first release, for databases created before them.
const hasColumn = (table, column) => !!db.prepare('SELECT 1 FROM pragma_table_info(?) WHERE name = ?').get(table, column);
if (!hasColumn('users', 'ui_language')) db.exec('ALTER TABLE users ADD COLUMN ui_language TEXT');

export const nowIso = () => new Date().toISOString();

export function tx(fn) {
  return db.transaction(fn)();
}
