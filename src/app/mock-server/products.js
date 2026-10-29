import { ValidationError, db, nowIso, tx } from './db.js';
import { FIELDS, RATING_MAX } from './fields.js';
import { assertCan, orgExists, scopeFilter } from './org.js';
import { getTemplate } from './templates.js';

export { ValidationError };

const SALES_CODE = /^\d{2}-\d{6}-\d$/;
/** Columns that are not field values but still part of a product version. */
const SCOPE_KEYS = ['region_code', 'bu_code', 'template_id'];

function allowedValues(category) {
  return new Set(db.prepare('SELECT value FROM lookups WHERE category = ?').all(category).map((r) => r.value));
}

const blank = (v) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');

/** Rows of a table field: trimmed strings, one per column; empty rows are dropped. */
function cleanTable(f, v) {
  const rows = Array.isArray(v) ? v : Array.isArray(v?.rows) ? v.rows : null;
  if (!rows) return { error: `${f.label} must be a table` };
  const out = rows
    .filter(Array.isArray)
    .map((r) => f.columns.map((_, i) => String(r[i] ?? '').trim()))
    .filter((r) => r.some(Boolean));
  return { value: out.length ? out : null };
}

/** Normalises the field values of a product and enforces controlled input. */
export function validateData(input = {}, { strictLookups = true } = {}) {
  const errors = {};
  const out = {};
  for (const f of FIELDS) {
    let v = input[f.key];
    if (typeof v === 'string') v = f.type === 'richtext' || f.type === 'textarea' ? v.replace(/\s+$/, '').replace(/^\s*\n/, '') : v.trim();
    if (blank(v)) v = null;
    if (f.type === 'table' && v !== null) {
      const t = cleanTable(f, v);
      if (t.error) errors[f.key] = t.error;
      v = t.value ?? null;
    }
    if (v === null) {
      if (f.required) errors[f.key] = `${f.label} is required`;
      out[f.key] = null;
      continue;
    }

    if (f.type === 'rating' || f.type === 'integer') {
      const n = Number(v);
      if (!Number.isInteger(n)) errors[f.key] = `${f.label} must be a whole number`;
      else if (f.type === 'rating' && (n < 1 || n > RATING_MAX)) errors[f.key] = `${f.label} must be between 1 and ${RATING_MAX}`;
      else if (f.min !== undefined && n < f.min) errors[f.key] = `${f.label} must be at least ${f.min}`;
      else v = n;
    } else if (f.type === 'number') {
      const n = Number(String(v).replace(',', '.'));
      if (Number.isNaN(n)) errors[f.key] = `${f.label} must be a number`;
      else v = n;
    } else if (f.type === 'boolean') {
      if (v === true || v === 'true' || v === 'yes' || v === 1) v = true;
      else if (v === false || v === 'false' || v === 'no' || v === 0) v = false;
      else errors[f.key] = `${f.label} must be yes or no`;
    } else if (f.type !== 'table') {
      v = String(v);
    }

    if (strictLookups && f.lookup && !errors[f.key] && !allowedValues(f.lookup).has(String(v))) {
      errors[f.key] = `"${v}" is not an allowed value for ${f.label}. Add it on the Lookups page first.`;
    }
    out[f.key] = v;
  }
  if (out.sales_code && !SALES_CODE.test(out.sales_code)) errors.sales_code = 'Product number must look like 85-622646-9';
  return { data: out, errors };
}

/** Region, business unit and template of a product; the template must fit both. */
function validateScope(input, errors) {
  const region = String(input.region_code ?? '');
  const bu = String(input.bu_code ?? '');
  const templateId = Number(input.template_id);
  if (!orgExists('region', region)) errors.region_code = 'Choose a region';
  if (!orgExists('bu', bu)) errors.bu_code = 'Choose a business unit';
  const template = templateId ? getTemplate(templateId) : null;
  if (!template) errors.template_id = 'Choose a template';
  else if (template.bu_code !== bu) errors.template_id = 'The template belongs to another business unit';
  else if (template.region_code && template.region_code !== region) errors.template_id = 'The template is for another region';
  return { region_code: region, bu_code: bu, template_id: templateId };
}

export function validateProduct(input) {
  const { data, errors } = validateData(input?.data ?? {});
  const scope = validateScope(input ?? {}, errors);
  if (Object.keys(errors).length) throw new ValidationError(errors);
  return { ...scope, data };
}

// ---- Reading ----------------------------------------------------------------------

const SELECT = `
  SELECT p.*, t.code template_code, t.name template_name
  FROM products p JOIN templates t ON t.id = p.template_id`;

export function toProduct(row) {
  return row ? { ...row, data: JSON.parse(row.data) } : null;
}

export const getProduct = (id) => toProduct(db.prepare(`${SELECT} WHERE p.id = ?`).get(id));

/** A product the user may see, or null. Throws when it exists but is outside the user's scopes. */
export function productFor(user, id, minRole = 'viewer') {
  const p = getProduct(id);
  if (p) assertCan(user, minRole, p.region_code, p.bu_code);
  return p;
}

export function listProducts(user, { search, region, bu, template, ids } = {}) {
  const scope = scopeFilter(user, 'viewer', 'p');
  const where = [scope.sql];
  const params = [...scope.params];
  if (search) {
    where.push('(p.sales_code LIKE ? OR p.name LIKE ? OR p.data LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (region) {
    where.push('p.region_code = ?');
    params.push(region);
  }
  if (bu) {
    where.push('p.bu_code = ?');
    params.push(bu);
  }
  if (template) {
    where.push('p.template_id = ?');
    params.push(Number(template));
  }
  if (ids?.length) {
    where.push(`p.id IN (${ids.map(() => '?').join(', ')})`);
    params.push(...ids);
  }
  return db
    .prepare(`${SELECT} WHERE ${where.join(' AND ')} ORDER BY p.bu_code, p.region_code, COALESCE(p.sales_code, ''), p.name`)
    .all(...params)
    .map(toProduct);
}

/** Values the TDS rules read: every field, with code, name and type from the columns. */
export const valuesOf = (p) => ({ ...(p.data ?? {}), sales_code: p.sales_code, name: p.name, product_type: p.product_type });

// ---- Writing ----------------------------------------------------------------------

function diff(before, after) {
  const changes = {};
  for (const k of SCOPE_KEYS) {
    const a = before?.[k] ?? null;
    const b = after?.[k] ?? null;
    if (String(a) !== String(b)) changes[k] = [a, b];
  }
  const keys = new Set([...Object.keys(before?.data ?? {}), ...Object.keys(after?.data ?? {})]);
  for (const k of keys) {
    const a = before?.data?.[k] ?? null;
    const b = after?.data?.[k] ?? null;
    if (JSON.stringify(a) !== JSON.stringify(b)) changes[k] = [a, b];
  }
  return changes;
}

export function logHistory(product, action, user, remark, changes) {
  db.prepare(
    `INSERT INTO product_history (product_id, region_code, bu_code, sales_code, name, version, action, changed_by, changed_at, remark, changes, snapshot)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    product.id,
    product.region_code,
    product.bu_code,
    product.sales_code,
    product.name,
    product.version,
    action,
    user ?? null,
    nowIso(),
    remark ?? null,
    changes ? JSON.stringify(changes) : null,
    JSON.stringify(product),
  );
}

function assertUniqueSalesCode(region, code, exceptId = null) {
  if (!code) return;
  const hit = db.prepare('SELECT id FROM products WHERE region_code = ? AND sales_code = ?').get(region, code);
  if (hit && hit.id !== exceptId) throw new ValidationError({ sales_code: `Product number ${code} already exists in ${region}` });
}

const columnsOf = (v) => ({
  region_code: v.region_code,
  bu_code: v.bu_code,
  template_id: v.template_id,
  sales_code: v.data.sales_code,
  name: v.data.name,
  product_type: v.data.product_type,
  data: JSON.stringify(v.data),
});

export function createProduct(input, user, remark, { by = user?.display_name } = {}) {
  const v = validateProduct(input);
  if (user) assertCan(user, 'editor', v.region_code, v.bu_code);
  return tx(() => {
    assertUniqueSalesCode(v.region_code, v.data.sales_code);
    const row = { ...columnsOf(v), version: 1, modified_at: nowIso(), modified_by: by ?? null, remarks: remark ?? null };
    const cols = Object.keys(row);
    const { lastInsertRowid } = db.prepare(`INSERT INTO products (${cols.join(', ')}) VALUES (${cols.map((c) => '@' + c).join(', ')})`).run(row);
    const product = getProduct(lastInsertRowid);
    logHistory(product, 'created', by, remark, diff(null, product));
    return product;
  });
}

/** Every saved change raises the version by one. Moving to another scope needs editor rights in both. */
export function updateProduct(id, input, user, remark) {
  const v = validateProduct(input);
  return tx(() => {
    const before = getProduct(id);
    if (!before) return null;
    assertCan(user, 'editor', before.region_code, before.bu_code);
    assertCan(user, 'editor', v.region_code, v.bu_code);
    assertUniqueSalesCode(v.region_code, v.data.sales_code, before.id);
    const changes = diff(before, v);
    if (!Object.keys(changes).length) return before;
    const row = columnsOf(v);
    const sets = [...Object.keys(row).map((k) => `${k} = @${k}`), 'version = version + 1', 'modified_at = @modified_at', 'modified_by = @modified_by', 'remarks = @remarks'];
    db.prepare(`UPDATE products SET ${sets.join(', ')} WHERE id = @id`).run({
      ...row,
      id,
      modified_at: nowIso(),
      modified_by: user.display_name,
      remarks: remark ?? null,
    });
    const after = getProduct(id);
    logHistory(after, 'updated', user.display_name, remark, changes);
    return after;
  });
}

export function deleteProduct(id, user, remark) {
  return tx(() => {
    const product = getProduct(id);
    if (!product) return false;
    assertCan(user, 'editor', product.region_code, product.bu_code);
    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    db.prepare("DELETE FROM translations WHERE scope = 'product.field' AND ref LIKE ?").run(`${id}:%`);
    logHistory(product, 'deleted', user.display_name, remark, null);
    return true;
  });
}

// ---- History ------------------------------------------------------------------------

const HISTORY_COLUMNS = 'id, product_id, region_code, bu_code, sales_code, name, version, action, changed_by, changed_at, remark, changes';

export function productHistory(id) {
  return db.prepare(`SELECT ${HISTORY_COLUMNS} FROM product_history WHERE product_id = ? ORDER BY id DESC`).all(id).map(parseHistory);
}

/** One page of the change history in the user's scopes, newest first, with the total for pagination. */
export function recentHistory(user, { limit = 50, offset = 0, search = '', hideImports = false, region, bu } = {}) {
  const scope = scopeFilter(user, 'viewer');
  const where = [scope.sql];
  const params = [...scope.params];
  if (hideImports) where.push("action <> 'imported'");
  if (region) {
    where.push('region_code = ?');
    params.push(region);
  }
  if (bu) {
    where.push('bu_code = ?');
    params.push(bu);
  }
  if (search) {
    where.push('(sales_code LIKE ? OR name LIKE ? OR changed_by LIKE ? OR remark LIKE ?)');
    params.push(...Array(4).fill(`%${search}%`));
  }
  const filter = `WHERE ${where.join(' AND ')}`;
  const total = db.prepare(`SELECT COUNT(*) n FROM product_history ${filter}`).get(...params).n;
  const items = db
    .prepare(`SELECT ${HISTORY_COLUMNS} FROM product_history ${filter} ORDER BY id DESC LIMIT ? OFFSET ?`)
    .all(...params, limit, offset)
    .map(parseHistory);
  return { items, total };
}

function parseHistory(row) {
  return { ...row, changes: row.changes ? JSON.parse(row.changes) : null };
}
