// A small better-sqlite3 look-alike on top of sql.js (SQLite compiled to
// WebAssembly), so the server code of v0.2 runs in the browser unchanged:
//
//   db.prepare(sql).get(...params) / .all(...params) / .run(...params)
//   db.exec(sql), db.transaction(fn)()
//
// Parameters are positional (?) or one object for named ones (@name).
// The database is kept in localStorage and saved after every change.

// sql.js is loaded as a plain script (copied to sqljs/ by angular.json), not
// bundled: its bundle refers to Node modules that break the dev server.
function loadSqlJs() {
  if (window.initSqlJs) return Promise.resolve(window.initSqlJs);
  return new Promise((resolve, reject) => {
    const script = Object.assign(document.createElement('script'), { src: 'sqljs/sql-wasm.js' });
    script.onload = () => resolve(window.initSqlJs);
    script.onerror = () => reject(new Error('Could not load the demo database (sqljs/sql-wasm.js)'));
    document.head.append(script);
  });
}

const STORAGE_KEY = 'tds.demo-db.v1';

const toSql = (v) => (v === undefined ? null : typeof v === 'boolean' ? (v ? 1 : 0) : v);

function bindParams(params) {
  if (params.length === 1 && params[0] !== null && typeof params[0] === 'object' && !Array.isArray(params[0]) && !(params[0] instanceof Uint8Array)) {
    const named = {};
    for (const [k, v] of Object.entries(params[0])) named[`@${k}`] = toSql(v);
    return named;
  }
  return params.map(toSql);
}

class Statement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql;
  }

  all(...params) {
    const stmt = this.db.raw.prepare(this.sql);
    try {
      stmt.bind(bindParams(params));
      const rows = [];
      while (stmt.step()) rows.push(stmt.getAsObject());
      return rows;
    } finally {
      stmt.free();
    }
  }

  get(...params) {
    return this.all(...params)[0];
  }

  run(...params) {
    const stmt = this.db.raw.prepare(this.sql);
    try {
      stmt.run(bindParams(params));
    } finally {
      stmt.free();
    }
    const changes = this.db.raw.getRowsModified();
    const lastInsertRowid = this.db.raw.exec('SELECT last_insert_rowid()')[0]?.values[0][0] ?? 0;
    this.db.changed = true;
    return { changes, lastInsertRowid };
  }
}

export class Database {
  constructor(raw) {
    this.raw = raw;
    this.depth = 0;
    this.changed = false;
  }

  prepare(sql) {
    return new Statement(this, sql);
  }

  exec(sql) {
    this.raw.exec(sql);
    this.changed = true;
  }

  /** Like better-sqlite3: returns a function that runs fn in a transaction (nested ones use savepoints). */
  transaction(fn) {
    return (...args) => {
      const sp = `sp${this.depth}`;
      this.raw.exec(this.depth === 0 ? 'BEGIN' : `SAVEPOINT ${sp}`);
      this.depth++;
      try {
        const result = fn(...args);
        this.depth--;
        this.raw.exec(this.depth === 0 ? 'COMMIT' : `RELEASE ${sp}`);
        return result;
      } catch (e) {
        this.depth--;
        this.raw.exec(this.depth === 0 ? 'ROLLBACK' : `ROLLBACK TO ${sp}; RELEASE ${sp}`);
        throw e;
      }
    };
  }

  /** Writes the database to localStorage if something changed since the last save. */
  save() {
    if (!this.changed) return;
    this.changed = false;
    try {
      const bytes = this.raw.export();
      let s = '';
      for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      localStorage.setItem(STORAGE_KEY, btoa(s));
    } catch (e) {
      console.warn('Demo data could not be saved in this browser; changes last until the page is reloaded.', e);
    }
  }
}

/** Opens the saved demo database, or an empty one. */
export async function openDatabase() {
  const initSqlJs = await loadSqlJs();
  const SQL = await initSqlJs({ locateFile: (file) => `sqljs/${file}` });
  let bytes = null;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) bytes = Uint8Array.from(atob(saved), (c) => c.charCodeAt(0));
  } catch {
    bytes = null;
  }
  try {
    return new Database(new SQL.Database(bytes ?? undefined));
  } catch {
    // A damaged copy: start again with fresh demo data.
    return new Database(new SQL.Database());
  }
}

export function forgetSavedDatabase() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nothing saved */
  }
}
