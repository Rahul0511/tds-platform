// Multi-language TDS content.
//
// EN is the base language: all content is written in English, and every
// other language holds translations of it in the `translations` table.
// A missing translation falls back to English, and the TDS reports how many
// texts were missing, still need review, or are outdated (English changed
// after the translation was made).
//
// Scopes of translatable texts:
//   label          fixed words of the layout ("Issue:", "Page")
//   field          field labels and table column headers printed on a TDS
//   phrase         phrase library
//   template       a template's own texts: titles, headings, inline texts
//   lookup         drop-down values that are words ("not recommended")
//   cell           words in product tables ("Yes", "Limited")
//   product.field  a product's own texts (description, properties ...)

import { sha256 } from './hash.js';
import { ValidationError, db, nowIso, tx } from './db.js';
import { FIELD_MAP, LOOKUP_CATEGORIES } from './fields.js';
import { DEFAULT_LANGUAGES, LABELS, seedDictionary } from './i18n-seed.js';
import { busWith, can, canAnywhere } from './org.js';
import { eachBlock, templateTexts } from './templates.js';

export const BASE_LANG = 'EN';
export { LABELS };

export const sourceHash = (text) => sha256(String(text ?? '')).slice(0, 16);
const keyOf = (scope, ref) => `${scope}\u0000${ref}`;

// ---- Languages ------------------------------------------------------------

export const listLanguages = () => db.prepare('SELECT * FROM languages ORDER BY sort_order, code').all().map((l) => ({ ...l, active: !!l.active, base: l.code === BASE_LANG }));

export function assertLanguage(code, { allowBase = true } = {}) {
  const lang = db.prepare('SELECT * FROM languages WHERE code = ?').get(String(code ?? '').toUpperCase());
  if (!lang) throw new ValidationError({ lang: `Unknown language "${code}"` });
  if (!allowBase && lang.code === BASE_LANG) throw new ValidationError({ lang: 'English is the source language and is not translated' });
  return lang.code;
}

export function addLanguage({ code, name }) {
  const c = String(code ?? '').trim().toUpperCase();
  const n = String(name ?? '').trim();
  if (!/^[A-Z]{2}(-[A-Z]{2})?$/.test(c)) throw new ValidationError({ code: 'Use a 2-letter code like ES, or a regional code like PT-BR' });
  if (!n) throw new ValidationError({ name: 'Name is required' });
  if (db.prepare('SELECT 1 FROM languages WHERE code = ?').get(c)) throw new ValidationError({ code: `${c} already exists` });
  const max = db.prepare('SELECT COALESCE(MAX(sort_order), 0) m FROM languages').get().m;
  db.prepare('INSERT INTO languages (code, name, active, sort_order) VALUES (?, ?, 1, ?)').run(c, n, max + 10);
  return listLanguages().find((l) => l.code === c);
}

export function updateLanguage(code, { name, active }) {
  const c = assertLanguage(code);
  if (c === BASE_LANG && active === false) throw new ValidationError({ active: 'English cannot be switched off' });
  if (name !== undefined && !String(name).trim()) throw new ValidationError({ name: 'Name is required' });
  db.prepare('UPDATE languages SET name = COALESCE(?, name), active = COALESCE(?, active) WHERE code = ?').run(
    name === undefined ? null : String(name).trim(),
    active === undefined ? null : active ? 1 : 0,
    c,
  );
  return listLanguages().find((l) => l.code === c);
}

export function deleteLanguage(code) {
  const c = assertLanguage(code, { allowBase: false });
  db.prepare('DELETE FROM languages WHERE code = ?').run(c); // translations cascade
}

// ---- Translatable items ----------------------------------------------------

const LABEL_NAMES = {
  product_name: 'Heading · Product name',
  issue: 'Issue date ("Issue:")',
  region: 'Region',
  date: 'Date',
  version: 'Version',
  page: 'Page number ("Page 1 / 2")',
  yes: 'Yes',
  no: 'No',
};

/** Field labels and table columns that templates print without a label of their own. */
function printedFieldLabels(templates) {
  const fields = new Set();
  const tables = new Set();
  for (const t of templates) {
    eachBlock(t.definition, (b) => {
      if (b.type === 'facts' || b.type === 'ratings') b.items.filter((i) => !i.label).forEach((i) => fields.add(i.field));
      if (b.type === 'field' && b.inline && !b.label) fields.add(b.field);
      if (b.type === 'table') tables.add(b.field);
    });
  }
  return { fields: [...fields], tables: [...tables] };
}

/**
 * Every English text that appears on a TDS, with where it comes from. bu and
 * region tell who may translate it (null = shared).
 */
export function sourceItems() {
  const items = [];
  const add = (scope, ref, group, label, source, { multiline = false, bu = null, region = null } = {}) => {
    if (source !== null && source !== undefined && String(source).trim() !== '') {
      items.push({ scope, ref: String(ref), group, label, source: String(source), multiline, bu, region });
    }
  };

  for (const [key, text] of Object.entries(LABELS)) add('label', key, 'Document labels', LABEL_NAMES[key] ?? key, text);

  const templates = db
    .prepare('SELECT * FROM templates ORDER BY bu_code, name')
    .all()
    .map((t) => ({ ...t, definition: JSON.parse(t.definition) }));

  const printed = printedFieldLabels(templates);
  for (const key of printed.fields) add('field', key, 'Field labels', FIELD_MAP.get(key)?.label ?? key, FIELD_MAP.get(key)?.label);
  for (const key of printed.tables) {
    const f = FIELD_MAP.get(key);
    for (const c of f?.columns ?? []) add('field', `${key}.${c.key}`, 'Field labels', `${f.label} · column`, c.label);
  }

  for (const p of db.prepare("SELECT * FROM phrases ORDER BY COALESCE(bu_code, ''), key").all()) {
    add('phrase', p.key, 'Phrase library', p.title, p.body, { multiline: true, bu: p.bu_code });
  }

  for (const t of templates) {
    for (const x of templateTexts(t.definition)) {
      add('template', `${t.code}:${x.ref}`, `Template · ${t.name}`, x.label, x.text, { multiline: x.multiline, bu: t.bu_code, region: t.region_code });
    }
  }

  for (const c of LOOKUP_CATEGORIES.filter((c) => c.translatable)) {
    for (const l of db.prepare('SELECT value FROM lookups WHERE category = ? ORDER BY sort_order').all(c.key)) {
      add('lookup', `${c.key}|${l.value}`, 'Drop-down values', c.label, l.value);
    }
  }

  const products = db.prepare('SELECT id, region_code, bu_code, sales_code, name, data FROM products ORDER BY bu_code, region_code, sales_code, name').all();
  const cells = new Set();
  for (const p of products) {
    const data = JSON.parse(p.data);
    for (const [key, value] of Object.entries(data)) {
      const f = FIELD_MAP.get(key);
      if (f?.type === 'table' && Array.isArray(value)) {
        f.columns.forEach((c, i) => c.translate && value.forEach((row) => row[i] && cells.add(row[i])));
      }
    }
  }
  for (const text of [...cells].sort()) add('cell', text, 'Table values', 'Table value', text);

  for (const p of products) {
    const data = JSON.parse(p.data);
    const title = [p.sales_code, p.name].filter(Boolean).join(' ');
    for (const [key, value] of Object.entries(data)) {
      const f = FIELD_MAP.get(key);
      if (f?.translatable) add('product.field', `${p.id}:${key}`, 'Product texts', `${title} · ${f.label}`, value, { multiline: true, bu: p.bu_code, region: p.region_code });
    }
  }
  return items;
}

/** Who may translate an item: editors of its region and business unit. */
function mayTranslate(user, item) {
  if (item.region && item.bu) return can(user, 'editor', item.region, item.bu);
  if (item.bu) return busWith(user, 'editor').includes(item.bu);
  return canAnywhere(user, 'editor');
}

/** Items the user may translate, merged with their translation in `lang`, each with a status. */
export function translationItems(lang, user) {
  const rows = new Map(db.prepare('SELECT * FROM translations WHERE lang = ?').all(lang).map((r) => [keyOf(r.scope, r.ref), r]));
  return sourceItems()
    .filter((item) => mayTranslate(user, item))
    .map((item) => {
      const r = rows.get(keyOf(item.scope, item.ref));
      const status = !r ? 'missing' : r.source_hash !== sourceHash(item.source) ? 'outdated' : r.status;
      return { ...item, text: r?.text ?? '', status, updated_at: r?.updated_at ?? null, updated_by: r?.updated_by ?? null };
    });
}

export function translationSummary(user) {
  const items = sourceItems().filter((item) => mayTranslate(user, item));
  return listLanguages()
    .filter((l) => !l.base)
    .map((l) => {
      const rows = new Map(db.prepare('SELECT scope, ref, status, source_hash FROM translations WHERE lang = ?').all(l.code).map((r) => [keyOf(r.scope, r.ref), r]));
      const s = { code: l.code, name: l.name, active: l.active, total: items.length, approved: 0, suggested: 0, outdated: 0, missing: 0 };
      for (const item of items) {
        const r = rows.get(keyOf(item.scope, item.ref));
        if (!r) s.missing++;
        else if (r.source_hash !== sourceHash(item.source)) s.outdated++;
        else s[r.status]++;
      }
      return s;
    });
}

function findItem(scope, ref, user) {
  const item = sourceItems().find((i) => i.scope === scope && i.ref === String(ref));
  if (!item) throw new ValidationError({ ref: 'This text no longer exists' });
  if (user && !mayTranslate(user, item)) throw new ValidationError({ ref: 'You may not translate this text' });
  return item;
}

/** Saves one translation. Empty text removes it (falls back to English again). */
export function saveTranslation({ scope, ref, lang, text, status }, user, by = user?.display_name) {
  const code = assertLanguage(lang, { allowBase: false });
  const item = findItem(scope, ref, user);
  const value = String(text ?? '');
  if (!value.trim()) {
    db.prepare('DELETE FROM translations WHERE scope = ? AND ref = ? AND lang = ?').run(scope, item.ref, code);
    return { ...item, text: '', status: 'missing', updated_at: null, updated_by: null };
  }
  const st = status === 'suggested' ? 'suggested' : 'approved';
  const now = nowIso();
  db.prepare(
    `INSERT INTO translations (scope, ref, lang, text, status, source_hash, updated_at, updated_by)
     VALUES (@scope, @ref, @lang, @text, @status, @hash, @now, @user)
     ON CONFLICT(scope, ref, lang) DO UPDATE SET text = excluded.text, status = excluded.status,
       source_hash = excluded.source_hash, updated_at = excluded.updated_at, updated_by = excluded.updated_by`,
  ).run({ scope, ref: item.ref, lang: code, text: value, status: st, hash: sourceHash(item.source), now, user: by });
  return { ...item, text: value, status: st, updated_at: now, updated_by: by };
}

/** Approves every up-to-date suggestion in a language that the user may translate (after review). */
export function approveAll(lang, user) {
  const code = assertLanguage(lang, { allowBase: false });
  const current = new Map(
    sourceItems()
      .filter((i) => mayTranslate(user, i))
      .map((i) => [keyOf(i.scope, i.ref), sourceHash(i.source)]),
  );
  const rows = db.prepare("SELECT scope, ref, source_hash FROM translations WHERE lang = ? AND status = 'suggested'").all(code);
  const ok = rows.filter((r) => current.get(keyOf(r.scope, r.ref)) === r.source_hash);
  const upd = db.prepare("UPDATE translations SET status = 'approved', updated_at = ?, updated_by = ? WHERE scope = ? AND ref = ? AND lang = ?");
  tx(() => ok.forEach((r) => upd.run(nowIso(), user.display_name, r.scope, r.ref, code)));
  return ok.length;
}

// ---- Translator used by the TDS rules ---------------------------------------

/**
 * Returns t(scope, ref, englishText) for one language plus per-document
 * statistics. English (or a missing translation) returns the English text.
 */
export function makeTranslator(lang = BASE_LANG) {
  const code = String(lang || BASE_LANG).toUpperCase();
  const rows = code === BASE_LANG ? new Map() : new Map(db.prepare('SELECT * FROM translations WHERE lang = ?').all(code).map((r) => [keyOf(r.scope, r.ref), r]));
  return {
    lang: code,
    start() {
      const stats = { missing: 0, suggested: 0, outdated: 0 };
      const t = (scope, ref, source) => {
        if (code === BASE_LANG || source === null || source === undefined || String(source).trim() === '') return source;
        const r = rows.get(keyOf(scope, ref));
        if (!r) {
          stats.missing++;
          return source;
        }
        if (r.source_hash !== sourceHash(source)) stats.outdated++;
        else if (r.status === 'suggested') stats.suggested++;
        return r.text;
      };
      return { t, stats };
    },
  };
}

// ---- Seeding --------------------------------------------------------------------

export function ensureLanguages() {
  const ins = db.prepare('INSERT OR IGNORE INTO languages (code, name, active, sort_order) VALUES (?, ?, 1, ?)');
  for (const l of DEFAULT_LANGUAGES) ins.run(l.code, l.name, l.sort_order);
}

// Each step adds starter translations once, so a translation somebody
// deleted on purpose is not brought back.
const SEED_VERSION = 1;

/** Insert the bundled DE/FR translations (as suggestions to review) that were not added yet. */
export function seedTranslations() {
  const done = Number(db.prepare("SELECT value FROM settings WHERE key = 'translations_seeded'").get()?.value ?? 0);
  if (done >= SEED_VERSION) return 0;
  const dict = seedDictionary();
  const ins = db.prepare(
    `INSERT OR IGNORE INTO translations (scope, ref, lang, text, status, source_hash, updated_at, updated_by)
     VALUES (?, ?, ?, ?, 'suggested', ?, ?, 'starter set')`,
  );
  let n = 0;
  tx(() => {
    for (const item of sourceItems()) {
      const entry = dict.get(item.source);
      if (!entry) continue;
      for (const lang of ['DE', 'FR']) if (entry[lang]) n += ins.run(item.scope, item.ref, lang, entry[lang], sourceHash(item.source), nowIso()).changes;
    }
    db.prepare("INSERT INTO settings (key, value) VALUES ('translations_seeded', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(String(SEED_VERSION));
  });
  return n;
}
