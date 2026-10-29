// The REST API of the v0.2 server, answered in the browser. Same routes,
// same rules and same error replies as the Express server had, so the app's
// pages work unchanged; mock-api.interceptor.ts routes /api/* requests here.
//
// Not available without a server: PDFs and ZIPs made on the server (the app
// uses the browser's "Save as PDF"), AI translation suggestions and the
// Excel import.

import {
  audit,
  changeOwnPassword,
  createUser,
  deleteUser,
  listUsers,
  login,
  logout,
  recentAudit,
  resetPassword,
  setUiLanguage,
  ssoLogin,
  updateUser,
  userForToken,
} from './auth.js';
import { ForbiddenError, ValidationError, db, initDb, nowIso } from './db.js';
import { FIELD_MAP, LOOKUP_CATEGORIES, RATING_MAX, publicFields } from './fields.js';
import {
  BASE_LANG,
  addLanguage,
  approveAll,
  assertLanguage,
  deleteLanguage,
  listLanguages,
  saveTranslation,
  translationItems,
  translationSummary,
  updateLanguage,
} from './i18n.js';
import {
  SCOPE_ROLES,
  addOrgUnit,
  assertCan,
  busWith,
  canAnywhere,
  deleteOrgUnit,
  listBusinessUnits,
  listRegions,
  scopeFilter,
  scopeSettings,
  setScopeSetting,
  updateOrgUnit,
} from './org.js';
import { createProduct, deleteProduct, listProducts, productFor, productHistory, recentHistory, updateProduct, validateData } from './products.js';
import { seedDemo } from './seed-demo.js';
import { forgetSavedDatabase } from './sqlite.js';
import { buildTds, loadContext } from './tds.js';
import { deletePhrase, fieldUsage, getTemplate, listPhrases, listTemplates, savePhrase } from './templates.js';

// ---- Start ------------------------------------------------------------------

let ready = null;

/** Opens (or creates) the demo database once; every request waits for it. */
export function startDemoServer() {
  ready ??= (async () => {
    await initDb();
    seedDemo();
    db.save();
  })();
  return ready;
}

/** Throws away every change made in this browser; the next start creates fresh demo data. */
export function resetDemoData() {
  forgetSavedDatabase();
}

// ---- Responses ------------------------------------------------------------------

class HttpError extends Error {
  constructor(status, body) {
    super(body?.error ?? 'Error');
    this.status = status;
    this.body = body;
  }
}

const notFound = (what = 'Not found') => new HttpError(404, { error: what });
const ok = (body, status = 200) => ({ status, body });
const noContent = () => ({ status: 204, body: null });

const str = (v) => (v === undefined || v === null ? undefined : String(v).trim() || undefined);
const pageOf = (q) => ({ limit: Math.min(Math.max(Number(q.limit) || 50, 1), 200), offset: Math.max(Number(q.offset) || 0, 0) });
const filterOf = (q) => ({ search: str(q.search), region: str(q.region), bu: str(q.bu), template: str(q.template) });
const langOf = (q) => (q.lang ? assertLanguage(String(q.lang)) : BASE_LANG);
const idsOf = (q) => q.ids?.toString().split(',').map(Number).filter(Boolean);

// ---- Access checks (the middleware of the Express server) ---------------------------

function requireAuth(req) {
  if (!req.user) throw new HttpError(401, { error: 'Please sign in' });
  if (req.user.must_change_password) throw new HttpError(403, { error: 'Please set a new password first', code: 'PASSWORD_CHANGE_REQUIRED' });
}

const GUARDS = {
  open: () => {},
  auth: requireAuth,
  admin: (req) => {
    requireAuth(req);
    if (!req.user.is_admin) throw new HttpError(403, { error: 'This needs a system administrator' });
  },
  viewer: (req) => role(req, 'viewer'),
  editor: (req) => role(req, 'editor'),
  buAdmin: (req) => role(req, 'bu_admin'),
};

function role(req, minRole) {
  requireAuth(req);
  if (!canAnywhere(req.user, minRole)) throw new HttpError(403, { error: `This needs the ${minRole} role` });
}

// ---- Routes --------------------------------------------------------------------

const routes = [];
const route = (method, path, guard, handler) => {
  const names = [];
  const re = new RegExp(`^${path.replace(/:(\w+)/g, (_, n) => (names.push(n), '([^/]+)'))}$`);
  routes.push({ method, re, names, guard: GUARDS[guard], handler });
};

// Auth (open)
route('POST', '/auth/login', 'open', (req) => {
  const { username, password, remember } = req.body ?? {};
  const result = login(username, password, !!remember);
  if (result.error) throw new HttpError(result.status, { error: result.error });
  return { ...ok(result.user), session: result };
});

route('POST', '/auth/sso', 'open', (req) => {
  const result = ssoLogin(req.body?.username);
  if (result.error) throw new HttpError(result.status, { error: result.error });
  return { ...ok(result.user), session: result };
});

/** Accounts offered by the demo Microsoft sign-in. */
route('GET', '/auth/sso/accounts', 'open', () =>
  ok(
    listUsers()
      .filter((u) => u.active)
      .map((u) => ({ username: u.username, display_name: u.display_name, email: u.email })),
  ),
);

route('POST', '/auth/logout', 'open', (req) => {
  logout(req.token);
  return { ...noContent(), session: { token: null } };
});

route('GET', '/auth/me', 'open', (req) => {
  if (!req.user) throw new HttpError(401, { error: 'Not signed in' });
  return ok(req.user);
});

route('POST', '/auth/password', 'open', (req) => {
  if (!req.user) throw new HttpError(401, { error: 'Please sign in' });
  return ok(changeOwnPassword(req.user, req.body?.current, req.body?.password, req.token, req.body?.ui_language));
});

route('PUT', '/auth/preferences', 'open', (req) => {
  if (!req.user) throw new HttpError(401, { error: 'Please sign in' });
  return ok(setUiLanguage(req.user, req.body?.ui_language));
});

// Users + access (system admin)
route('GET', '/users', 'admin', () => ok(listUsers()));
route('POST', '/users', 'admin', (req) => ok(createUser(req.body ?? {}, req.user), 201));
route('PUT', '/users/:id', 'admin', (req) => {
  const u = updateUser(Number(req.params.id), req.body ?? {}, req.user);
  if (!u) throw notFound('User not found');
  return ok(u);
});
route('POST', '/users/:id/reset-password', 'admin', (req) => {
  const r = resetPassword(Number(req.params.id), req.user);
  if (!r) throw notFound('User not found');
  return ok(r);
});
route('DELETE', '/users/:id', 'admin', (req) => {
  if (!deleteUser(Number(req.params.id), req.user)) throw notFound('User not found');
  return noContent();
});
route('GET', '/audit', 'admin', (req) => ok(recentAudit(pageOf(req.query))));

// Organisation
route('GET', '/org', 'auth', () => ok({ regions: listRegions(), businessUnits: listBusinessUnits(), settings: scopeSettings(), roles: SCOPE_ROLES }));
for (const [kind, path] of [
  ['region', 'regions'],
  ['bu', 'business-units'],
]) {
  route('POST', `/${path}`, 'admin', (req) => {
    const unit = addOrgUnit(kind, req.body ?? {});
    audit(req.user.username, `${kind}.created`, unit.code, unit.name);
    return ok(unit, 201);
  });
  route('PUT', `/${path}/:code`, 'admin', (req) => {
    const unit = updateOrgUnit(kind, req.params.code, req.body ?? {});
    if (!unit) throw notFound();
    audit(req.user.username, `${kind}.updated`, unit.code, `${unit.name}${unit.active ? '' : ' (off)'}`);
    return ok(unit);
  });
  route('DELETE', `/${path}/:code`, 'admin', (req) => {
    if (!deleteOrgUnit(kind, req.params.code)) throw notFound();
    audit(req.user.username, `${kind}.deleted`, req.params.code);
    return noContent();
  });
}
route('PUT', '/scope-settings', 'buAdmin', (req) => {
  const { region_code, bu_code, key, value } = req.body ?? {};
  return ok(setScopeSetting(String(region_code ?? ''), String(bu_code ?? ''), String(key ?? ''), value, req.user));
});

// Meta
route('GET', '/meta', 'auth', () => ok({ fields: publicFields(), lookupCategories: LOOKUP_CATEGORIES, ratingMax: RATING_MAX, roles: SCOPE_ROLES }));
route('GET', '/fields', 'auth', () => {
  const usage = fieldUsage();
  return ok(publicFields().map((f) => ({ ...f, bus: [...(usage.get(f.key)?.bus ?? [])], templates: [...(usage.get(f.key)?.templates ?? [])] })));
});
route('GET', '/stats', 'auth', (req) => {
  const scope = scopeFilter(req.user, 'viewer');
  const count = (sql, ...p) => db.prepare(sql).get(...p).n;
  const bus = busWith(req.user, 'viewer');
  return ok({
    products: count(`SELECT COUNT(*) n FROM products WHERE ${scope.sql}`, ...scope.params),
    // Every active business unit the user can see, also those without products yet
    byBu: db
      .prepare(
        `SELECT b.code bu_code, COUNT(p.id) n FROM business_units b
         LEFT JOIN products p ON p.bu_code = b.code AND ${scopeFilter(req.user, 'viewer', 'p').sql}
         WHERE b.active = 1 AND b.code IN (${bus.map(() => '?').join(',') || 'NULL'})
         GROUP BY b.code ORDER BY n DESC, b.sort_order`,
      )
      .all(...scope.params, ...bus),
    byRegion: db.prepare(`SELECT region_code, COUNT(*) n FROM products WHERE ${scope.sql} GROUP BY region_code ORDER BY n DESC`).all(...scope.params),
    templates: listTemplates(bus).filter((t) => t.active).length,
    phrases: count('SELECT COUNT(*) n FROM phrases'),
    changesLast30Days: count(
      `SELECT COUNT(*) n FROM product_history WHERE ${scope.sql} AND changed_at >= ? AND action <> 'imported'`,
      ...scope.params,
      new Date(Date.now() - 30 * 864e5).toISOString(),
    ),
    lastChange: db.prepare(`SELECT changed_at FROM product_history WHERE ${scope.sql} ORDER BY id DESC LIMIT 1`).get(...scope.params)?.changed_at ?? null,
  });
});

// Products
route('GET', '/products', 'auth', (req) => ok(listProducts(req.user, filterOf(req.query))));
route('GET', '/products/:id', 'auth', (req) => {
  const p = productFor(req.user, Number(req.params.id));
  if (!p) throw notFound('Product not found');
  return ok(p);
});
route('POST', '/products', 'editor', (req) => {
  const { remark, ...input } = req.body ?? {};
  return ok(createProduct(input, req.user, remark), 201);
});
route('PUT', '/products/:id', 'editor', (req) => {
  const { remark, ...input } = req.body ?? {};
  const p = updateProduct(Number(req.params.id), input, req.user, remark);
  if (!p) throw notFound('Product not found');
  return ok(p);
});
route('DELETE', '/products/:id', 'editor', (req) => {
  if (!deleteProduct(Number(req.params.id), req.user, req.query.remark?.toString())) throw notFound('Product not found');
  return noContent();
});
route('GET', '/products/:id/history', 'auth', (req) => {
  const p = productFor(req.user, Number(req.params.id));
  if (!p) throw notFound('Product not found');
  return ok(productHistory(p.id));
});
route('GET', '/history', 'auth', (req) =>
  ok(
    recentHistory(req.user, {
      ...pageOf(req.query),
      search: str(req.query.search),
      hideImports: req.query.hideImports === 'true',
      region: str(req.query.region),
      bu: str(req.query.bu),
    }),
  ),
);

// TDS documents
route('GET', '/tds/:id', 'auth', (req) => {
  const p = productFor(req.user, Number(req.params.id));
  if (!p) throw notFound('Product not found');
  return ok(buildTds(p, loadContext(langOf(req.query))));
});

/** Unsaved product values, possibly incomplete or invalid, as a draft for the preview. */
function draftOf(body, user) {
  const { data } = validateData(body.data ?? {}, { strictLookups: false });
  // Values that do not parse yet (e.g. "1," while typing) are shown as typed.
  for (const [k, v] of Object.entries(body.data ?? {})) if (data[k] === null && v !== null && typeof v !== 'object') data[k] = v;
  const saved = body.id ? productFor(user, Number(body.id)) : null;
  return {
    id: saved?.id,
    region_code: String(body.region_code ?? saved?.region_code ?? ''),
    bu_code: String(body.bu_code ?? saved?.bu_code ?? ''),
    template_id: Number(body.template_id ?? saved?.template_id),
    sales_code: data.sales_code,
    name: data.name ?? '',
    product_type: data.product_type,
    data,
    version: saved ? saved.version + 1 : 1,
    modified_at: nowIso(),
  };
}

route('POST', '/tds/preview', 'editor', (req) => {
  const draft = draftOf(req.body ?? {}, req.user);
  assertCan(req.user, 'editor', draft.region_code, draft.bu_code);
  const ctx = loadContext(langOf(req.query));
  if (!ctx.templates.has(draft.template_id)) throw new ValidationError({ template_id: 'Choose a template' });
  return ok(buildTds(draft, ctx));
});
route('GET', '/tds', 'auth', (req) => {
  const ctx = loadContext(langOf(req.query));
  const ids = idsOf(req.query);
  return ok(listProducts(req.user, ids?.length ? { ids } : filterOf(req.query)).map((p) => buildTds(p, ctx)));
});

// Templates (read-only: they are written in src/app/templates) + phrases
route('GET', '/templates', 'auth', (req) => ok(listTemplates(busWith(req.user, 'viewer'))));
route('GET', '/templates/:id', 'auth', (req) => {
  const t = getTemplate(Number(req.params.id));
  if (!t || !busWith(req.user, 'viewer').includes(t.bu_code)) throw notFound('Template not found');
  return ok(t);
});
route('GET', '/phrases', 'auth', () => ok(listPhrases()));
route('POST', '/phrases', 'buAdmin', (req) => ok(savePhrase(req.body?.key, req.body ?? {}, req.user, { create: true }), 201));
route('PUT', '/phrases/:key', 'buAdmin', (req) => {
  const p = savePhrase(req.params.key, req.body ?? {}, req.user);
  if (!p) throw notFound('Phrase not found');
  return ok(p);
});
route('DELETE', '/phrases/:key', 'buAdmin', (req) => {
  if (!deletePhrase(req.params.key, req.user)) throw notFound('Phrase not found');
  return noContent();
});

// Languages + translations
route('GET', '/languages', 'auth', () => ok(listLanguages()));
route('POST', '/languages', 'admin', (req) => ok(addLanguage(req.body ?? {}), 201));
route('PUT', '/languages/:code', 'admin', (req) => ok(updateLanguage(req.params.code, req.body ?? {})));
route('DELETE', '/languages/:code', 'admin', (req) => {
  deleteLanguage(req.params.code);
  return noContent();
});
route('GET', '/translations/summary', 'auth', (req) => ok(translationSummary(req.user)));
route('GET', '/translations/ai', 'auth', () => ok({ enabled: false, model: null }));
route('GET', '/translations', 'editor', (req) => ok(translationItems(assertLanguage(req.query.lang?.toString(), { allowBase: false }), req.user)));
route('PUT', '/translations', 'editor', (req) => ok(saveTranslation(req.body ?? {}, req.user)));
route('POST', '/translations/approve-all', 'editor', (req) => ok({ approved: approveAll(req.body?.lang, req.user) }));

// Lookups (drop-down values)
/**
 * Standard lists belong to everyone and need a system admin; a business
 * unit's own lists can be changed by its BU admins.
 */
function assertLookupRights(user, category) {
  const cat = LOOKUP_CATEGORIES.find((c) => c.key === category);
  if (!cat) throw new ValidationError({ category: 'Unknown category' });
  if (user.is_admin) return cat;
  const usage = fieldUsage();
  const bus = new Set([...FIELD_MAP.values()].filter((f) => f.lookup === category).flatMap((f) => [...(usage.get(f.key)?.bus ?? [])]));
  const mine = busWith(user, 'bu_admin');
  if (cat.standard || ![...bus].some((b) => mine.includes(b))) throw new ForbiddenError('Only a system admin or a BU admin of a business unit that uses this list can change it');
  return cat;
}

function lookupUsage() {
  const usage = {};
  for (const f of [...FIELD_MAP.values()].filter((f) => f.lookup)) {
    for (const r of db.prepare(`SELECT CAST(json_extract(data, '$.${f.key}') AS TEXT) v, COUNT(*) n FROM products WHERE v IS NOT NULL GROUP BY v`).all()) {
      usage[`${f.lookup}|${r.v}`] = (usage[`${f.lookup}|${r.v}`] ?? 0) + r.n;
    }
  }
  return usage;
}

route('GET', '/lookups', 'auth', () => {
  const usage = lookupUsage();
  const rows = db.prepare('SELECT * FROM lookups ORDER BY category, sort_order, value').all();
  return ok(rows.map((r) => ({ ...r, used_by: usage[`${r.category}|${r.value}`] ?? 0 })));
});
route('POST', '/lookups', 'editor', (req) => {
  const category = String(req.body?.category ?? '').trim();
  let value = String(req.body?.value ?? '').trim();
  assertLookupRights(req.user, category);
  if (!value) throw new ValidationError({ value: 'Value is required' });
  // Lists behind number fields must hold numbers in the same form the product stores.
  const field = [...FIELD_MAP.values()].find((f) => f.lookup === category);
  if (field?.type === 'number' || field?.type === 'integer') {
    const n = Number(value.replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0) throw new ValidationError({ value: `${field.label} must be a positive number` });
    value = String(n);
  }
  if (db.prepare('SELECT 1 FROM lookups WHERE category = ? AND value = ?').get(category, value)) throw new ValidationError({ value: `"${value}" already exists` });
  const max = db.prepare('SELECT COALESCE(MAX(sort_order), 0) m FROM lookups WHERE category = ?').get(category).m;
  const { lastInsertRowid } = db.prepare('INSERT INTO lookups (category, value, sort_order) VALUES (?, ?, ?)').run(category, value, max + 10);
  return ok(db.prepare('SELECT * FROM lookups WHERE id = ?').get(lastInsertRowid), 201);
});
route('DELETE', '/lookups/:id', 'editor', (req) => {
  const row = db.prepare('SELECT * FROM lookups WHERE id = ?').get(Number(req.params.id));
  if (!row) throw notFound();
  assertLookupRights(req.user, row.category);
  const used = lookupUsage()[`${row.category}|${row.value}`] ?? 0;
  if (used) throw new HttpError(409, { error: `"${row.value}" is used by ${used} product(s) and cannot be deleted` });
  db.prepare('DELETE FROM lookups WHERE id = ?').run(row.id);
  db.prepare("DELETE FROM translations WHERE scope = 'lookup' AND ref = ?").run(`${row.category}|${row.value}`);
  return noContent();
});

// ---- Dispatch -------------------------------------------------------------------

/**
 * Answers one API request.
 * session.token in the result: absent = keep, null = signed out, string = new session.
 *
 * @param {{ method: string, path: string, query?: Record<string, string>, body?: any, token?: string | null }} request  path is the part after /api
 * @returns {Promise<{ status: number, body: any, session?: { token: string | null, remember?: boolean } }>}
 */
export async function handle({ method, path, query = {}, body = null, token = null }) {
  try {
    await startDemoServer();
  } catch (err) {
    ready = null; // try again on the next request
    console.error(err);
    return { status: 503, body: { error: `The demo database could not start: ${err?.message ?? err}` } };
  }
  const req = { method, path, query, body, token, params: {}, user: userForToken(token) };
  try {
    for (const r of routes) {
      if (r.method !== method) continue;
      const m = r.re.exec(path);
      if (!m) continue;
      r.names.forEach((n, i) => (req.params[n] = decodeURIComponent(m[i + 1])));
      r.guard(req);
      const result = r.handler(req);
      return result;
    }
    if (method === 'GET' && /^\/tds\/[^/]+\/pdf$|^\/tds\/export\.zip$/.test(path)) {
      throw new HttpError(501, { error: 'PDF files are made by the browser in this version: use Save as PDF.' });
    }
    throw notFound('Unknown API route');
  } catch (err) {
    if (err instanceof HttpError) return { status: err.status, body: err.body };
    if (err instanceof ValidationError) return { status: 400, body: { error: 'Please fix the highlighted fields', fields: err.errors } };
    if (err instanceof ForbiddenError) return { status: 403, body: { error: err.message } };
    console.error(err);
    return { status: 500, body: { error: err?.message || 'Server error' } };
  } finally {
    db?.save();
  }
}
