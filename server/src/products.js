import { db, nowIso, tx } from './db.js';
import { FIELD_KEYS, PRODUCT_FIELDS, RATING_MAX } from './fields.js';

export class ValidationError extends Error {
  constructor(errors) {
    super('Validation failed');
    this.errors = errors;
  }
}

const SALES_CODE = /^\d{2}-\d{6}-\d$/;

function allowedValues(category) {
  return new Set(db.prepare('SELECT value FROM lookups WHERE category = ?').all(category).map((r) => r.value));
}

// Normalises the payload and enforces controlled input.
export function validateProduct(input, { strictLookups = true } = {}) {
  const errors = {};
  const out = {};

  for (const f of PRODUCT_FIELDS) {
    let v = input[f.key];
    if (typeof v === 'string') v = v.trim();
    if (v === '' || v === undefined) v = null;

    if (v === null) {
      if (f.required) errors[f.key] = `${f.label} is required`;
      out[f.key] = null;
      continue;
    }

    if (f.type === 'rating' || f.type === 'integer') {
      const n = Number(v);
      if (!Number.isInteger(n)) errors[f.key] = `${f.label} must be a whole number`;
      else if (f.type === 'rating' && (n < 1 || n > RATING_MAX)) errors[f.key] = `${f.label} must be between 1 and ${RATING_MAX}`;
      else v = n;
    } else if (f.type === 'number') {
      const n = Number(String(v).replace(',', '.'));
      if (Number.isNaN(n)) errors[f.key] = `${f.label} must be a number`;
      else v = n;
    } else {
      v = String(v);
    }

    if (strictLookups && f.lookup && !errors[f.key] && !allowedValues(f.lookup).has(String(v))) {
      errors[f.key] = `"${v}" is not an allowed value for ${f.label}. Add it on the Lookups page first.`;
    }
    out[f.key] = v;
  }

  if (out.sales_code && !SALES_CODE.test(out.sales_code)) {
    errors.sales_code = 'Sales code must look like 15-609656-2';
  }
  if (out.header && !db.prepare('SELECT 1 FROM headers WHERE code = ?').get(out.header)) {
    errors.header = `Unknown header "${out.header}"`;
  }

  if (Object.keys(errors).length) throw new ValidationError(errors);
  return out;
}

export const getProduct = (id) => db.prepare('SELECT * FROM products WHERE id = ?').get(id);

export function listProducts({ search, header } = {}) {
  const where = [];
  const params = {};
  if (search) {
    where.push('(sales_code LIKE @q OR designation LIKE @q OR description LIKE @q)');
    params.q = `%${search}%`;
  }
  if (header) {
    where.push('header = @header');
    params.header = header;
  }
  const sql = `SELECT * FROM products ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY sales_code`;
  return db.prepare(sql).all(params);
}

function diff(before, after) {
  const changes = {};
  for (const k of FIELD_KEYS) {
    const a = before?.[k] ?? null;
    const b = after?.[k] ?? null;
    if (String(a) !== String(b)) changes[k] = [a, b];
  }
  return changes;
}

function logHistory(product, action, user, remark, changes) {
  db.prepare(
    `INSERT INTO product_history (product_id, sales_code, version, action, changed_by, changed_at, remark, changes, snapshot)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    product.id,
    product.sales_code,
    product.version,
    action,
    user ?? null,
    nowIso(),
    remark ?? null,
    changes ? JSON.stringify(changes) : null,
    JSON.stringify(product),
  );
}

function assertUniqueSalesCode(code, exceptId = null) {
  const hit = db.prepare('SELECT id FROM products WHERE sales_code = ?').get(code);
  if (hit && hit.id !== exceptId) throw new ValidationError({ sales_code: `Sales code ${code} already exists` });
}

export function createProduct(input, user, remark) {
  const data = validateProduct(input);
  return tx(() => {
    assertUniqueSalesCode(data.sales_code);
    const cols = [...FIELD_KEYS, 'version', 'modified_at', 'modified_by', 'remarks'];
    const row = { ...data, version: 1, modified_at: nowIso(), modified_by: user ?? null, remarks: remark ?? null };
    const { lastInsertRowid } = db
      .prepare(`INSERT INTO products (${cols.join(', ')}) VALUES (${cols.map((c) => '@' + c).join(', ')})`)
      .run(row);
    const product = getProduct(lastInsertRowid);
    logHistory(product, 'created', user, remark, diff(null, product));
    return product;
  });
}

// Every saved change raises the version by one, like the "Vers." column in Excel.
export function updateProduct(id, input, user, remark) {
  const data = validateProduct(input);
  return tx(() => {
    const before = getProduct(id);
    if (!before) return null;
    assertUniqueSalesCode(data.sales_code, before.id);
    const changes = diff(before, data);
    if (!Object.keys(changes).length) return before;

    const sets = [...FIELD_KEYS.map((k) => `${k} = @${k}`), 'version = version + 1', 'modified_at = @modified_at', 'modified_by = @modified_by', 'remarks = @remarks'];
    db.prepare(`UPDATE products SET ${sets.join(', ')} WHERE id = @id`).run({
      ...data,
      id,
      modified_at: nowIso(),
      modified_by: user ?? null,
      remarks: remark ?? null,
    });
    const after = getProduct(id);
    logHistory(after, 'updated', user, remark, changes);
    return after;
  });
}

export function deleteProduct(id, user, remark) {
  return tx(() => {
    const product = getProduct(id);
    if (!product) return false;
    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    logHistory(product, 'deleted', user, remark, null);
    return true;
  });
}

export function productHistory(id) {
  return db
    .prepare('SELECT id, product_id, sales_code, version, action, changed_by, changed_at, remark, changes FROM product_history WHERE product_id = ? ORDER BY id DESC')
    .all(id)
    .map(parseHistory);
}

/** One page of the change history, newest first, with the total for pagination. */
export function recentHistory({ limit = 50, offset = 0, search = '', hideImports = false } = {}) {
  const where = [];
  const params = {};
  if (hideImports) where.push("action <> 'imported'");
  if (search) {
    where.push('(sales_code LIKE @q OR changed_by LIKE @q OR remark LIKE @q)');
    params.q = `%${search}%`;
  }
  const filter = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const total = db.prepare(`SELECT COUNT(*) n FROM product_history ${filter}`).get(params).n;
  const items = db
    .prepare(
      `SELECT id, product_id, sales_code, version, action, changed_by, changed_at, remark, changes FROM product_history ${filter}
       ORDER BY id DESC LIMIT @limit OFFSET @offset`,
    )
    .all({ ...params, limit, offset })
    .map(parseHistory);
  return { items, total };
}

function parseHistory(row) {
  return { ...row, changes: row.changes ? JSON.parse(row.changes) : null };
}

export { logHistory };
