// Imports TDS-SF-OPV-database.xlsx into SQLite.
//
//   npm run import                      -> ../../TDS-SF-OPV-database.xlsx
//   npm run import -- path\to\file.xlsx
//
// Sheets used: Masterdata (products) and Dropdown_EN (lookups).
// Re-running is safe: products are matched on sales code and updated.

import ExcelJS from 'exceljs';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { db, nowIso, tx } from './db.js';
import { LOOKUP_CATEGORIES, PRODUCT_FIELDS, FIELD_KEYS } from './fields.js';
import { DEFAULT_SETTINGS, DEFAULT_TEXT_BLOCKS } from './seed-defaults.js';
import { logHistory } from './products.js';

const here = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_EXCEL = process.env.TDS_EXCEL_PATH || path.resolve(here, '..', '..', '..', 'TDS-SF-OPV-database.xlsx');

const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

function cellValue(cell) {
  let v = cell.value;
  if (v && typeof v === 'object') {
    if (v instanceof Date) return v;
    if ('result' in v) v = v.result; // formula
    else if ('richText' in v) v = v.richText.map((t) => t.text).join('');
    else if ('text' in v) v = v.text; // hyperlink
  }
  if (typeof v === 'string') v = v.trim();
  return v === '' || v === undefined ? null : v;
}

function readTable(sheet) {
  const headerRow = sheet.getRow(1);
  const headers = [];
  headerRow.eachCell({ includeEmpty: true }, (c, col) => (headers[col] = norm(cellValue(c))));
  const rows = [];
  sheet.eachRow((row, idx) => {
    if (idx === 1) return;
    const rec = {};
    row.eachCell({ includeEmpty: true }, (c, col) => (rec[col] = cellValue(c)));
    // Columns past the row's last filled cell are missing: read them as null.
    rows.push(new Proxy(rec, { get: (t, k) => t[k] ?? null }));
  });
  return { headers, rows };
}

const findCol = (headers, regex) => headers.findIndex((h) => h && regex.test(h));

function toRating(v) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null; // 0, "n.a." and blanks -> n.a.
}

function seedDefaults() {
  const insBlock = db.prepare(
    'INSERT OR IGNORE INTO text_blocks (key, title, body, sort_order, updated_at) VALUES (@key, @title, @body, @sort_order, @updated_at)',
  );
  for (const b of DEFAULT_TEXT_BLOCKS) insBlock.run({ ...b, updated_at: nowIso() });
  const insSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) insSetting.run(k, v);
}

export async function importExcel(file = DEFAULT_EXCEL, user = 'excel-import') {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const master = wb.getWorksheet('Masterdata');
  if (!master) throw new Error(`No "Masterdata" sheet in ${file}`);
  const dropdown = wb.getWorksheet('Dropdown_EN');

  // Products
  const { headers, rows } = readTable(master);
  const col = Object.fromEntries(PRODUCT_FIELDS.map((f) => [f.key, findCol(headers, f.excel)]));
  const colDate = findCol(headers, /^date of creation/i);
  const colVersion = findCol(headers, /^vers/i);
  const colIntended = findCol(headers, /^intended use/i);
  const colCompliance = findCol(headers, /^compliance phrase/i);
  const colCreator = findCol(headers, /^creator/i);
  const colRemarks = findCol(headers, /^remarks/i);
  const missing = Object.entries(col).filter(([, i]) => i < 0).map(([k]) => k);
  if (missing.length) throw new Error(`Masterdata columns not found: ${missing.join(', ')}`);

  const products = [];
  const headerPhrases = {};
  for (const r of rows) {
    const salesCode = r[col.sales_code];
    if (!salesCode) continue; // empty template rows (25-60)
    const p = {};
    for (const f of PRODUCT_FIELDS) {
      const v = r[col[f.key]];
      if (f.type === 'rating') p[f.key] = toRating(v);
      else if (f.type === 'number' || f.type === 'integer') p[f.key] = v === null || Number.isNaN(Number(v)) ? null : Number(v);
      else p[f.key] = v === null ? null : String(v);
    }
    const date = r[colDate];
    p.modified_at = date instanceof Date ? date.toISOString() : nowIso();
    p.version = Number(r[colVersion]) || 1;
    p.modified_by = r[colCreator] ? String(r[colCreator]) : null;
    p.remarks = r[colRemarks] ? String(r[colRemarks]) : null;
    products.push(p);
    headerPhrases[p.header] ??= { intended_use: r[colIntended] ?? '', compliance: r[colCompliance] ?? '' };
  }

  // Lookups: Dropdown_EN values first (keeps their order), then any value
  // the products already use, so every imported product stays valid.
  const lookups = Object.fromEntries(LOOKUP_CATEGORIES.map((c) => [c.key, []]));
  const headerCodes = new Set();
  if (dropdown) {
    const t = readTable(dropdown);
    for (const c of LOOKUP_CATEGORIES) {
      const i = findCol(t.headers, c.excel);
      // Single letters ("y", "z") are placeholder rows in Dropdown_EN.
      if (i >= 0) for (const r of t.rows) if (r[i] !== null && (typeof r[i] === 'number' || String(r[i]).length > 1)) lookups[c.key].push(String(r[i]));
    }
    const hi = findCol(t.headers, /^header$/i);
    if (hi >= 0) for (const r of t.rows) if (r[hi]) headerCodes.add(String(r[hi]));
  }
  // Values that differ only in case collapse into one (the Dropdown_EN
  // spelling wins) and the product is rewritten to that spelling, so every
  // imported product passes validation.
  for (const f of PRODUCT_FIELDS.filter((f) => f.lookup)) {
    for (const p of products) {
      if (p[f.key] === null) continue;
      const v = String(p[f.key]);
      const list = lookups[f.lookup];
      const hit = list.find((x) => x.toLowerCase() === v.toLowerCase());
      if (!hit) list.push(v);
      else if (hit !== v && f.type === 'text') p[f.key] = hit;
    }
  }
  for (const p of products) headerCodes.add(p.header);

  const stats = { products: { inserted: 0, updated: 0 }, lookups: 0, headers: headerCodes.size };

  tx(() => {
    seedDefaults();

    const insHeader = db.prepare(
      `INSERT INTO headers (code, intended_use, compliance) VALUES (?, ?, ?)
       ON CONFLICT(code) DO UPDATE SET intended_use = excluded.intended_use, compliance = excluded.compliance
       WHERE excluded.intended_use <> '' OR excluded.compliance <> ''`,
    );
    for (const code of headerCodes) {
      const ph = headerPhrases[code] ?? { intended_use: '', compliance: '' };
      insHeader.run(code, ph.intended_use, ph.compliance);
    }

    const insLookup = db.prepare('INSERT OR IGNORE INTO lookups (category, value, sort_order) VALUES (?, ?, ?)');
    for (const [category, values] of Object.entries(lookups)) {
      [...new Set(values)].forEach((v, i) => (stats.lookups += insLookup.run(category, v, (i + 1) * 10).changes));
    }

    const cols = [...FIELD_KEYS, 'version', 'modified_at', 'modified_by', 'remarks'];
    const upsert = db.prepare(
      `INSERT INTO products (${cols.join(', ')}) VALUES (${cols.map((c) => '@' + c).join(', ')})
       ON CONFLICT(sales_code) DO UPDATE SET ${cols.filter((c) => c !== 'sales_code').map((c) => `${c} = excluded.${c}`).join(', ')}`,
    );
    const find = db.prepare('SELECT * FROM products WHERE sales_code = ?');
    for (const p of products) {
      const existed = !!find.get(p.sales_code);
      upsert.run(p);
      stats.products[existed ? 'updated' : 'inserted']++;
      logHistory(find.get(p.sales_code), 'imported', user, `Imported from ${path.basename(file)}`, null);
    }
  });

  return stats;
}

export function ensureDefaults() {
  tx(seedDefaults);
}

// CLI entry point
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const file = path.resolve(process.argv[2] ?? DEFAULT_EXCEL);
  if (!fs.existsSync(file)) {
    console.error(`File not found: ${file}`);
    process.exit(1);
  }
  importExcel(file)
    .then((s) => console.log(`Imported ${path.basename(file)}:`, JSON.stringify(s)))
    .catch((e) => {
      console.error(e.message);
      process.exit(1);
    });
}
