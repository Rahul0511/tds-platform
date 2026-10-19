// Multi-language TDS content.
//
// EN is the base language: all content is written in English, and every
// other language holds translations of it in the `translations` table.
// A missing translation falls back to English, and the TDS reports how many
// texts were missing, still need review, or are outdated (English changed
// after the translation was made).

import crypto from 'node:crypto';
import { db, nowIso, tx } from './db.js';
import { LOOKUP_CATEGORIES } from './fields.js';
import { DEFAULT_LANGUAGES, LABELS, seedDictionary } from './i18n-seed.js';
import { ValidationError } from './products.js';

export const BASE_LANG = 'EN';
export { LABELS };

/** Text blocks whose heading is printed on the TDS (the others have no visible heading). */
const PRINTED_TITLES = new Set(['fields_of_application', 'processing_advice', 'storage_handling', 'general_information', 'compliance_intro', 'preservatives']);

export const sourceHash = (text) => crypto.createHash('sha1').update(String(text ?? '')).digest('hex').slice(0, 16);
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
  title: 'Document title',
  region: 'Region',
  date: 'Date',
  version: 'Version',
  product_description: 'Heading · Product description',
  recommended_substrates: 'Recommended substrates',
  up_to: 'Heat resistance prefix ("up to")',
  product_safety: 'Heading · Product safety',
  intended_use: 'Heading · Intended use',
  page: 'Page number ("Page 1 / 2")',
};

/** Readable name for a layout label in the translation list. */
function labelName(key, text) {
  if (key.startsWith('rating.')) return `Rating · ${text.replace(/\s*\*+$/, '')}`;
  if (key === 'phys.viscosity_note') return 'Technical data · Viscosity method';
  if (key.startsWith('phys.')) return `Technical data · ${text}`;
  return LABEL_NAMES[key] ?? key;
}

/** Every English text that appears on a TDS, with where it comes from. */
export function sourceItems() {
  const items = [];
  const add = (scope, ref, group, label, source, multiline = false) => {
    if (source !== null && source !== undefined && String(source).trim() !== '') items.push({ scope, ref: String(ref), group, label, source: String(source), multiline });
  };

  for (const [key, text] of Object.entries(LABELS)) add('label', key, 'Document labels', labelName(key, text), text);
  const series = db.prepare("SELECT value FROM settings WHERE key = 'series_title'").get()?.value;
  add('setting', 'series_title', 'Document labels', 'Series title', series);

  for (const b of db.prepare('SELECT * FROM text_blocks ORDER BY sort_order').all()) {
    if (PRINTED_TITLES.has(b.key)) add('block.title', b.key, 'Text blocks', `${b.title} · heading`, b.title);
    add('block.body', b.key, 'Text blocks', b.title, b.body, true);
  }

  for (const h of db.prepare('SELECT * FROM headers ORDER BY code').all()) {
    add('header.intended_use', h.code, 'Header rules', `${h.code} · intended use`, h.intended_use, true);
    add('header.compliance', h.code, 'Header rules', `${h.code} · compliance text`, h.compliance, true);
  }

  const cats = LOOKUP_CATEGORIES.filter((c) => c.translatable);
  for (const c of cats) {
    for (const l of db.prepare('SELECT value FROM lookups WHERE category = ? ORDER BY sort_order').all(c.key)) {
      add('lookup', `${c.key}|${l.value}`, 'Drop-down values', c.label, l.value);
    }
  }

  for (const p of db.prepare('SELECT id, sales_code, designation, description FROM products ORDER BY sales_code').all()) {
    add('product.description', p.id, 'Product descriptions', `${p.sales_code} ${p.designation}`, p.description, true);
  }
  return items;
}

/** Items merged with their translation in `lang`, each with a status. */
export function translationItems(lang) {
  const rows = new Map(db.prepare('SELECT * FROM translations WHERE lang = ?').all(lang).map((r) => [keyOf(r.scope, r.ref), r]));
  return sourceItems().map((item) => {
    const r = rows.get(keyOf(item.scope, item.ref));
    const status = !r ? 'missing' : r.source_hash !== sourceHash(item.source) ? 'outdated' : r.status;
    return { ...item, text: r?.text ?? '', status, updated_at: r?.updated_at ?? null, updated_by: r?.updated_by ?? null };
  });
}

export function translationSummary() {
  const items = sourceItems();
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

function findItem(scope, ref) {
  const item = sourceItems().find((i) => i.scope === scope && i.ref === String(ref));
  if (!item) throw new ValidationError({ ref: 'This text no longer exists' });
  return item;
}

/** Saves one translation. Empty text removes it (falls back to English again). */
export function saveTranslation({ scope, ref, lang, text, status }, user) {
  const code = assertLanguage(lang, { allowBase: false });
  const item = findItem(scope, ref);
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
  ).run({ scope, ref: item.ref, lang: code, text: value, status: st, hash: sourceHash(item.source), now, user });
  return { ...item, text: value, status: st, updated_at: now, updated_by: user };
}

/** Approves every up-to-date suggestion in a language (after review). */
export function approveAll(lang, user) {
  const code = assertLanguage(lang, { allowBase: false });
  const current = new Map(sourceItems().map((i) => [keyOf(i.scope, i.ref), sourceHash(i.source)]));
  const rows = db.prepare("SELECT scope, ref, source_hash FROM translations WHERE lang = ? AND status = 'suggested'").all(code);
  const ok = rows.filter((r) => current.get(keyOf(r.scope, r.ref)) === r.source_hash);
  const upd = db.prepare("UPDATE translations SET status = 'approved', updated_at = ?, updated_by = ? WHERE scope = ? AND ref = ? AND lang = ?");
  tx(() => ok.forEach((r) => upd.run(nowIso(), user, r.scope, r.ref, code)));
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

// Each step adds starter translations once. Later steps only cover texts that
// were added to the app after the first release, so a translation somebody
// deleted on purpose is not brought back.
const SEED_STEPS = [
  { version: 1, includes: () => true },
  { version: 2, includes: (item) => item.scope === 'label' && item.ref === 'page' },
];

/** Insert the bundled DE/FR translations (as suggestions to review) that were not added yet. */
export function seedTranslations() {
  const done = Number(db.prepare("SELECT value FROM settings WHERE key = 'translations_seeded'").get()?.value ?? 0);
  const steps = SEED_STEPS.filter((s) => s.version > done);
  if (!steps.length) return 0;
  const dict = seedDictionary();
  const ins = db.prepare(
    `INSERT OR IGNORE INTO translations (scope, ref, lang, text, status, source_hash, updated_at, updated_by)
     VALUES (?, ?, ?, ?, 'suggested', ?, ?, 'starter set')`,
  );
  let n = 0;
  tx(() => {
    for (const item of sourceItems()) {
      const entry = dict.get(item.source);
      if (!entry || !steps.some((s) => s.includes(item))) continue;
      for (const lang of ['DE', 'FR']) if (entry[lang]) n += ins.run(item.scope, item.ref, lang, entry[lang], sourceHash(item.source), nowIso()).changes;
    }
    db.prepare("INSERT INTO settings (key, value) VALUES ('translations_seeded', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(
      String(SEED_STEPS[SEED_STEPS.length - 1].version),
    );
  });
  return n;
}
