import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, DB_PATH, nowIso } from './db.js';
import { LOOKUP_CATEGORIES, PRODUCT_FIELDS, RATING_MAX } from './fields.js';
import {
  ValidationError,
  createProduct,
  deleteProduct,
  getProduct,
  listProducts,
  productHistory,
  recentHistory,
  updateProduct,
} from './products.js';
import { buildTds, loadContext } from './tds.js';
import { DEFAULT_EXCEL, ensureDefaults, importExcel } from './import-excel.js';
import { closeBrowser, productPdf, productsZip } from './pdf.js';
import {
  BASE_LANG,
  addLanguage,
  approveAll,
  assertLanguage,
  deleteLanguage,
  ensureLanguages,
  listLanguages,
  saveTranslation,
  seedTranslations,
  translationItems,
  translationSummary,
  updateLanguage,
} from './i18n.js';
import { aiStatus, suggestTranslations } from './ai-translate.js';
import { resetToTestData } from './test-data.js';
import {
  ROLES,
  authenticate,
  changeOwnPassword,
  createUser,
  deleteUser,
  ensureInitialAdmin,
  listUsers,
  login,
  logout,
  recentAudit,
  requireAuth,
  requireRole,
  resetPassword,
  sameOriginOnly,
  sessionCookie,
  SESSION_COOKIE,
  setUiLanguage,
  updateUser,
} from './auth.js';

const PORT = Number(process.env.PORT) || 3000;
const here = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIST = path.resolve(here, '..', '..', 'client', 'dist', 'client', 'browser');
// Where the headless browser loads the /print page from.
const APP_URL = (process.env.TDS_APP_URL || `http://localhost:${PORT}`).replace(/\/$/, '');

// Behind a hosting proxy (e.g. Render) set TDS_TRUST_PROXY=1, so secure cookies
// and the client IP come from the proxy's X-Forwarded-* headers.
const TRUST_PROXY = process.env.TDS_TRUST_PROXY;

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', TRUST_PROXY ? (/^\d+$/.test(TRUST_PROXY) ? Number(TRUST_PROXY) : TRUST_PROXY) : 'loopback');
app.use(express.json({ limit: '1mb' }));
app.use('/api', sameOriginOnly, authenticate);

// Name written into the change history.
const userOf = (req) => req.user?.display_name ?? 'unknown';
const editor = requireRole('editor');
const admin = requireRole('admin');

const notFound = (res, what = 'Not found') => res.status(404).json({ error: what });
// ?limit=&offset= for paged lists (limit 1-200).
const pageOf = (req) => ({
  limit: Math.min(Math.max(Number(req.query.limit) || 50, 1), 200),
  offset: Math.max(Number(req.query.offset) || 0, 0),
});
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function sendFile(res, buffer, fileName, type) {
  const ascii = fileName.replace(/[^ -~]/g, '_');
  res.set({
    'Content-Type': type,
    'Content-Disposition': `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    'Content-Length': buffer.length,
  });
  res.end(buffer);
}

// For the hosting platform's health check.
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// ---- Auth (open) ---------------------------------------------------------------

app.post('/api/auth/login', (req, res) => {
  const { username, password, remember } = req.body ?? {};
  const result = login(username, password, !!remember);
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.cookie(...sessionCookie(result.token, result.maxAge, req.secure));
  res.json(result.user);
});

app.post('/api/auth/logout', (req, res) => {
  logout(req.sessionToken);
  res.clearCookie(SESSION_COOKIE, { path: '/' });
  res.status(204).end();
});

app.get('/api/auth/me', (req, res) => (req.user ? res.json(req.user) : res.status(401).json({ error: 'Not signed in' })));

// Allowed while a one-time password is still active, so it can be replaced.
app.post('/api/auth/password', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Please sign in' });
  res.json(changeOwnPassword(req.user, req.body?.current, req.body?.password, req.sessionToken, req.body?.ui_language));
});

// Language of the app's pages for the signed-in user.
app.put('/api/auth/preferences', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Please sign in' });
  res.json(setUiLanguage(req.user, req.body?.ui_language));
});

// Everything below needs a signed-in user.
app.use('/api', (req, res, next) => (req.path.startsWith('/auth/') ? next() : requireAuth(req, res, next)));

// ---- Users + roles (admin) ------------------------------------------------------

app.get('/api/users', admin, (_req, res) => res.json(listUsers()));
app.post('/api/users', admin, (req, res) => res.status(201).json(createUser(req.body ?? {}, req.user)));
app.put('/api/users/:id', admin, (req, res) => {
  const u = updateUser(Number(req.params.id), req.body ?? {}, req.user);
  u ? res.json(u) : notFound(res, 'User not found');
});
app.post('/api/users/:id/reset-password', admin, (req, res) => {
  const r = resetPassword(Number(req.params.id), req.user);
  r ? res.json(r) : notFound(res, 'User not found');
});
app.delete('/api/users/:id', admin, (req, res) => (deleteUser(Number(req.params.id), req.user) ? res.status(204).end() : notFound(res, 'User not found')));
app.get('/api/audit', admin, (req, res) => res.json(recentAudit(pageOf(req))));
app.get('/api/roles', (_req, res) => res.json(ROLES));

// ---- Meta -----------------------------------------------------------------

app.get('/api/meta', (_req, res) => {
  res.json({ fields: PRODUCT_FIELDS.map(({ excel, ...f }) => f), lookupCategories: LOOKUP_CATEGORIES.map(({ excel, ...c }) => c), ratingMax: RATING_MAX });
});

app.get('/api/stats', (_req, res) => {
  const count = (sql) => db.prepare(sql).get().n;
  res.json({
    products: count('SELECT COUNT(*) n FROM products'),
    byHeader: db.prepare('SELECT header, COUNT(*) n FROM products GROUP BY header ORDER BY n DESC').all(),
    lookups: count('SELECT COUNT(*) n FROM lookups'),
    textBlocks: count('SELECT COUNT(*) n FROM text_blocks'),
    changesLast30Days: count("SELECT COUNT(*) n FROM product_history WHERE changed_at >= datetime('now', '-30 days') AND action <> 'imported'"),
    lastChange: db.prepare("SELECT changed_at FROM product_history ORDER BY id DESC LIMIT 1").get()?.changed_at ?? null,
  });
});

// ---- Products ---------------------------------------------------------------

app.get('/api/products', (req, res) => {
  res.json(listProducts({ search: req.query.search?.toString(), header: req.query.header?.toString() }));
});

app.get('/api/products/:id', (req, res) => {
  const p = getProduct(Number(req.params.id));
  p ? res.json(p) : notFound(res, 'Product not found');
});

app.post('/api/products', editor, (req, res) => {
  const { remark, ...data } = req.body ?? {};
  res.status(201).json(createProduct(data, userOf(req), remark));
});

app.put('/api/products/:id', editor, (req, res) => {
  const { remark, ...data } = req.body ?? {};
  const p = updateProduct(Number(req.params.id), data, userOf(req), remark);
  p ? res.json(p) : notFound(res, 'Product not found');
});

app.delete('/api/products/:id', editor, (req, res) => {
  const id = Number(req.params.id);
  if (!deleteProduct(id, userOf(req), req.query.remark?.toString())) return notFound(res, 'Product not found');
  db.prepare("DELETE FROM translations WHERE scope = 'product.description' AND ref = ?").run(String(id));
  res.status(204).end();
});

app.get('/api/products/:id/history', (req, res) => res.json(productHistory(Number(req.params.id))));
app.get('/api/history', (req, res) =>
  res.json(recentHistory({ ...pageOf(req), search: req.query.search?.toString().trim(), hideImports: req.query.hideImports === 'true' })),
);

// ---- TDS documents (the "creator") -----------------------------------------

// Language of a TDS request: ?lang=DE (default English).
const langOf = (req) => (req.query.lang ? assertLanguage(req.query.lang.toString()) : BASE_LANG);
const idsOf = (req) => req.query.ids?.toString().split(',').map(Number).filter(Boolean);

// PDF export: one PDF per product and language, or a ZIP of separate PDFs.
// ?langs=EN,DE exports every product in each listed language.
app.get(
  '/api/tds/export.zip',
  wrap(async (req, res) => {
    const langs = [...new Set((req.query.langs?.toString() || req.query.lang?.toString() || BASE_LANG).split(',').map((l) => assertLanguage(l.trim())))];
    const ids = idsOf(req);
    const products = ids?.length ? ids.map(getProduct).filter(Boolean) : listProducts();
    if (!products.length) return notFound(res, 'No products to export');
    const items = langs.flatMap((lang) => {
      const ctx = loadContext(lang);
      return products.map((product) => ({ product, lang, fileName: buildTds(product, ctx).meta.fileName }));
    });
    const zip = await productsZip(APP_URL, req.sessionToken, items);
    const tag = langs.length > 1 ? langs.join('-') : langs[0];
    sendFile(res, zip, `TDS_export_${products.length}_${tag}_${new Date().toISOString().slice(0, 10)}.zip`, 'application/zip');
  }),
);

app.get(
  '/api/tds/:id/pdf',
  wrap(async (req, res) => {
    const p = getProduct(Number(req.params.id));
    if (!p) return notFound(res, 'Product not found');
    const lang = langOf(req);
    const { fileName, pdf } = await productPdf(APP_URL, req.sessionToken, p, buildTds(p, loadContext(lang)).meta.fileName, lang);
    sendFile(res, pdf, fileName, 'application/pdf');
  }),
);

app.get('/api/tds/:id', (req, res) => {
  const p = getProduct(Number(req.params.id));
  p ? res.json(buildTds(p, loadContext(langOf(req)))) : notFound(res, 'Product not found');
});

// Preview of unsaved form data: same rules, nothing is stored.
app.post('/api/tds/preview', editor, (req, res) => {
  const body = req.body ?? {};
  const saved = body.id ? getProduct(Number(body.id)) : null;
  const draft = { ...body, version: saved ? saved.version + 1 : 1, modified_at: nowIso() };
  res.json(buildTds(draft, loadContext(langOf(req))));
});

// Several TDS at once, like "create all" in the Excel tool. ?ids=1,2,3 or all.
app.get('/api/tds', (req, res) => {
  const ctx = loadContext(langOf(req));
  const ids = idsOf(req);
  const products = ids?.length ? ids.map(getProduct).filter(Boolean) : listProducts();
  res.json(products.map((p) => buildTds(p, ctx)));
});

// ---- Languages + translations ------------------------------------------------

app.get('/api/languages', (_req, res) => res.json(listLanguages()));
app.post('/api/languages', admin, (req, res) => res.status(201).json(addLanguage(req.body ?? {})));
app.put('/api/languages/:code', admin, (req, res) => res.json(updateLanguage(req.params.code, req.body ?? {})));
app.delete('/api/languages/:code', admin, (req, res) => {
  deleteLanguage(req.params.code);
  res.status(204).end();
});

app.get('/api/translations/summary', (_req, res) => res.json(translationSummary()));
app.get('/api/translations/ai', (_req, res) => res.json(aiStatus()));
app.get('/api/translations', editor, (req, res) => {
  res.json(translationItems(assertLanguage(req.query.lang?.toString(), { allowBase: false })));
});
app.put('/api/translations', editor, (req, res) => res.json(saveTranslation(req.body ?? {}, userOf(req))));
app.post('/api/translations/approve-all', editor, (req, res) => res.json({ approved: approveAll(req.body?.lang, userOf(req)) }));
app.post(
  '/api/translations/suggest',
  editor,
  wrap(async (req, res) => {
    const lang = assertLanguage(req.body?.lang, { allowBase: false });
    res.json(await suggestTranslations(lang, req.body?.items, userOf(req)));
  }),
);

// ---- Lookups (drop-down values) -------------------------------------------

app.get('/api/lookups', (_req, res) => {
  const rows = db.prepare('SELECT * FROM lookups ORDER BY category, sort_order, value').all();
  const usage = {};
  for (const f of PRODUCT_FIELDS.filter((f) => f.lookup)) {
    for (const r of db.prepare(`SELECT CAST(${f.key} AS TEXT) v, COUNT(*) n FROM products WHERE ${f.key} IS NOT NULL GROUP BY ${f.key}`).all()) {
      usage[`${f.lookup}|${r.v}`] = (usage[`${f.lookup}|${r.v}`] ?? 0) + r.n;
    }
  }
  res.json(rows.map((r) => ({ ...r, used_by: usage[`${r.category}|${r.value}`] ?? 0 })));
});

app.post('/api/lookups', editor, (req, res) => {
  const category = String(req.body?.category ?? '').trim();
  let value = String(req.body?.value ?? '').trim();
  if (!LOOKUP_CATEGORIES.some((c) => c.key === category)) throw new ValidationError({ category: 'Unknown category' });
  if (!value) throw new ValidationError({ value: 'Value is required' });
  // Lists behind number fields must hold numbers in the same form the product stores.
  const field = PRODUCT_FIELDS.find((f) => f.lookup === category);
  if (field?.type === 'number' || field?.type === 'integer') {
    const n = Number(value.replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0) throw new ValidationError({ value: `${field.label} must be a positive number` });
    if (field.type === 'integer' && !Number.isInteger(n)) throw new ValidationError({ value: `${field.label} must be a whole number` });
    value = String(n);
  }
  if (db.prepare('SELECT 1 FROM lookups WHERE category = ? AND value = ?').get(category, value)) {
    throw new ValidationError({ value: `"${value}" already exists` });
  }
  const max = db.prepare('SELECT COALESCE(MAX(sort_order), 0) m FROM lookups WHERE category = ?').get(category).m;
  const { lastInsertRowid } = db.prepare('INSERT INTO lookups (category, value, sort_order) VALUES (?, ?, ?)').run(category, value, max + 10);
  res.status(201).json(db.prepare('SELECT * FROM lookups WHERE id = ?').get(lastInsertRowid));
});

app.delete('/api/lookups/:id', editor, (req, res) => {
  const row = db.prepare('SELECT * FROM lookups WHERE id = ?').get(Number(req.params.id));
  if (!row) return notFound(res);
  const fields = PRODUCT_FIELDS.filter((f) => f.lookup === row.category);
  const used = fields.reduce((n, f) => n + db.prepare(`SELECT COUNT(*) n FROM products WHERE CAST(${f.key} AS TEXT) = ?`).get(row.value).n, 0);
  if (used) return res.status(409).json({ error: `"${row.value}" is used by ${used} product(s) and cannot be deleted` });
  db.prepare('DELETE FROM lookups WHERE id = ?').run(row.id);
  db.prepare("DELETE FROM translations WHERE scope = 'lookup' AND ref = ?").run(`${row.category}|${row.value}`);
  res.status(204).end();
});

// ---- Headers (rules for intended use + compliance) -------------------------

app.get('/api/headers', (_req, res) => {
  res.json(db.prepare('SELECT h.*, (SELECT COUNT(*) FROM products p WHERE p.header = h.code) used_by FROM headers h ORDER BY code').all());
});

app.post('/api/headers', editor, (req, res) => {
  const code = String(req.body?.code ?? '').trim();
  if (!code) throw new ValidationError({ code: 'Code is required' });
  if (db.prepare('SELECT 1 FROM headers WHERE code = ?').get(code)) throw new ValidationError({ code: `"${code}" already exists` });
  db.prepare('INSERT INTO headers (code, intended_use, compliance) VALUES (?, ?, ?)').run(code, req.body?.intended_use ?? '', req.body?.compliance ?? '');
  res.status(201).json(db.prepare('SELECT * FROM headers WHERE code = ?').get(code));
});

app.put('/api/headers/:code', editor, (req, res) => {
  const info = db
    .prepare('UPDATE headers SET intended_use = ?, compliance = ? WHERE code = ?')
    .run(String(req.body?.intended_use ?? ''), String(req.body?.compliance ?? ''), req.params.code);
  info.changes ? res.json(db.prepare('SELECT * FROM headers WHERE code = ?').get(req.params.code)) : notFound(res);
});

// ---- Text blocks + settings -------------------------------------------------

app.get('/api/text-blocks', (_req, res) => res.json(db.prepare('SELECT * FROM text_blocks ORDER BY sort_order').all()));

app.put('/api/text-blocks/:key', editor, (req, res) => {
  const title = String(req.body?.title ?? '').trim();
  if (!title) throw new ValidationError({ title: 'Title is required' });
  const info = db
    .prepare('UPDATE text_blocks SET title = ?, body = ?, updated_at = ?, updated_by = ? WHERE key = ?')
    .run(title, String(req.body?.body ?? ''), nowIso(), userOf(req), req.params.key);
  info.changes ? res.json(db.prepare('SELECT * FROM text_blocks WHERE key = ?').get(req.params.key)) : notFound(res);
});

app.get('/api/settings', (_req, res) => res.json(Object.fromEntries(db.prepare('SELECT key, value FROM settings').all().map((s) => [s.key, s.value]))));

app.put('/api/settings', admin, (req, res) => {
  const upsert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  for (const [k, v] of Object.entries(req.body ?? {})) upsert.run(k, String(v ?? ''));
  res.json(Object.fromEntries(db.prepare('SELECT key, value FROM settings').all().map((s) => [s.key, s.value])));
});

// ---- Errors + client --------------------------------------------------------

app.use('/api', (_req, res) => notFound(res, 'Unknown API route'));

if (fs.existsSync(CLIENT_DIST)) {
  // Build files carry a content hash (main-ABCD1234.js) and never change: cache
  // them for good. Everything else, above all index.html, is revalidated so a
  // new deployment is picked up on the next page load.
  const HASHED = /-[A-Z0-9]{8}\.(js|css)$/;
  app.use(
    express.static(CLIENT_DIST, {
      index: false,
      setHeaders: (res, file) => res.set('Cache-Control', HASHED.test(file) ? 'public, max-age=31536000, immutable' : 'no-cache'),
    }),
  );
  // Angular routes get index.html. A missing file (e.g. a code chunk from an
  // older build) must be a real 404, not index.html, or the app fails silently.
  app.get('*', (req, res) => {
    if (path.extname(req.path)) return res.status(404).type('text/plain').send('Not found');
    res.set('Cache-Control', 'no-cache').sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

app.use((err, _req, res, _next) => {
  if (err instanceof ValidationError) return res.status(400).json({ error: 'Please fix the highlighted fields', fields: err.errors });
  console.error(err);
  res.status(500).json({ error: err.message || 'Server error' });
});

// ---- Start ------------------------------------------------------------------

ensureDefaults();
ensureLanguages();
const initialAdmin = ensureInitialAdmin();
if (initialAdmin) {
  console.log('\n  First start: an administrator account was created.');
  console.log(`  User name: ${initialAdmin.username}`);
  console.log(`  Password:  ${initialAdmin.password}   (you must change it at first sign-in)\n`);
}
// A new database starts with made-up test products (this is a prototype).
// Set TDS_EXCEL_PATH to import an Excel file instead.
const productCount = db.prepare('SELECT COUNT(*) n FROM products').get().n;
if (productCount === 0 && process.env.TDS_EXCEL_PATH && fs.existsSync(DEFAULT_EXCEL)) {
  const stats = await importExcel(DEFAULT_EXCEL);
  console.log('Empty database, imported Excel:', JSON.stringify(stats));
} else if (productCount === 0) {
  console.log('Empty database, added test products:', resetToTestData().join(', '));
}
const seeded = seedTranslations();
if (seeded) console.log(`Added ${seeded} starter translations (DE, FR) for review.`);

for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => closeBrowser().finally(() => process.exit(0)));

app.listen(PORT, () => {
  console.log(`TDS API on http://localhost:${PORT}  (db: ${DB_PATH})`);
});
