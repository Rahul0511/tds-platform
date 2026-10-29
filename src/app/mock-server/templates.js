// TDS templates and the phrase library.
//
// A template is a plan for one kind of TDS: which sections, which blocks in
// each section, in which order. Blocks are the reusable bricks:
//
//   text      standard text: a phrase from the library, or text of its own
//   field     one product field (a text, a number, a rich text ...)
//   facts     key-value table of product fields (rows, or columns like CoF static / dynamic)
//   ratings   1-10 dot scales (Sheetfed)
//   table     a product table field: anilox rollers, product list (product matrix)
//   choice    a text picked by a field's value, e.g. the safety text by the intended use
//   group     a heading over blocks; printed only when one of them has content
//   columns   blocks side by side
//
// Every block may have `when`: it is printed only if the condition holds,
// e.g. { field: 'product_type', op: 'in', value: ['Ink', 'Ink series'] }.
// Blocks and sections without content are left out, so a TDS never has
// empty sections. Ids must be unique within a template: translations of the
// template's own texts are stored under them.
//
// The templates themselves are written in code (src/app/templates) and
// copied into the database on start; they are not edited in the app.

import { ValidationError, db, nowIso, tx } from './db.js';
import { FIELD_MAP } from './fields.js';
import { ALL, assertCan, orgExists } from './org.js';

// ---- Walking a definition ----------------------------------------------------------

/** Calls fn(block, section) for every block, including the ones inside groups and columns. */
export function eachBlock(def, fn) {
  const walk = (blocks, section) => {
    for (const b of blocks) {
      fn(b, section);
      if (b.type === 'group') walk(b.blocks, section);
      if (b.type === 'columns') b.columns.forEach((c) => walk(c, section));
    }
  };
  for (const s of def.sections) walk(s.blocks, s);
}

const conditions = (when) => (when ? (Array.isArray(when) ? when : [when]) : []);

/** Field keys a block prints. */
function blockFields(b) {
  if (b.type === 'facts' || b.type === 'ratings') return b.items.map((i) => i.field);
  if (b.type === 'field' || b.type === 'table' || b.type === 'choice') return [b.field];
  return [];
}

const PLACEHOLDER = /\{\{\s*([\w.]+)\s*\}\}/g;
const placeholders = (text) => [...String(text ?? '').matchAll(PLACEHOLDER)].map((m) => m[1]);

/** Texts of a block (its own and the phrases it uses), to find {{placeholders}}. */
function blockTexts(b, phrases) {
  const out = [b.text, b.phrase && phrases.get(b.phrase)];
  if (b.type === 'choice') b.options.forEach((o) => out.push(o.text, o.phrase && phrases.get(o.phrase)));
  if (b.type === 'facts') b.items.forEach((i) => out.push(i.format));
  return out.filter(Boolean);
}

/**
 * Every field the template uses, grouped by section in print order: the
 * fields it prints, the ones its conditions look at and the ones its texts
 * fill in ({{shelf_life_months}}). This is what the product form shows.
 */
export function fieldsOf(def, phrases = loadPhraseBodies()) {
  const groups = [];
  const seen = new Set();
  for (const s of def.sections) {
    const keys = [];
    const add = (k) => {
      if (!seen.has(k) && FIELD_MAP.has(k)) {
        seen.add(k);
        keys.push(k);
      }
    };
    conditions(s.when).forEach((c) => add(c.field));
    const walk = (blocks) => {
      for (const b of blocks) {
        conditions(b.when).forEach((c) => add(c.field));
        blockFields(b).forEach(add);
        blockTexts(b, phrases).forEach((t) => placeholders(t).forEach(add));
        if (b.type === 'group') walk(b.blocks);
        if (b.type === 'columns') b.columns.forEach(walk);
      }
    };
    walk(s.blocks);
    if (keys.length) groups.push({ section: s.id, title: s.title ?? '', keys });
  }
  return groups;
}

const loadPhraseBodies = () => new Map(db.prepare('SELECT key, body FROM phrases').all().map((p) => [p.key, p.body]));

/** Fields the template's conditions look at (so the form can show them). */
export function conditionFields(def) {
  const out = new Set();
  const visit = (when) => conditions(when).forEach((c) => out.add(c.field));
  for (const s of def.sections) visit(s.when);
  eachBlock(def, (b) => {
    visit(b.when);
    if (b.type === 'facts') b.items.forEach((i) => visit(i.marker?.when));
  });
  return [...out];
}

/** Phrase keys a definition refers to. */
export function phrasesOf(def) {
  const out = new Set();
  eachBlock(def, (b) => {
    if (b.type === 'text' && b.phrase) out.add(b.phrase);
    if (b.type === 'choice') b.options.forEach((o) => o.phrase && out.add(o.phrase));
  });
  if (def.footer?.disclaimer?.phrase) out.add(def.footer.disclaimer.phrase);
  return [...out];
}

/**
 * The template's own texts (not phrases) with their translation refs. The
 * TDS builder looks texts up under the same refs, so both must agree.
 */
export function templateTexts(def) {
  const out = [];
  const add = (ref, label, text, multiline = false) => {
    if (text && String(text).trim()) out.push({ ref, label, text: String(text), multiline });
  };
  add('title', 'Document title', def.docTitle);
  add('series', 'Series title', def.seriesTitle);
  add('prefix', 'Product title prefix', def.productPrefix);
  for (const s of def.sections) add(`s:${s.id}`, `Section · ${s.title ?? s.id}`, s.title);
  eachBlock(def, (b, s) => {
    const where = `${s.title ?? s.id}`;
    add(`b:${b.id}:heading`, `${where} · heading`, b.heading);
    if (b.type === 'text') add(`b:${b.id}:text`, `${where} · text`, b.text, true);
    if (b.type === 'field') add(`b:${b.id}:label`, `${where} · label`, b.label);
    if (b.type === 'facts' || b.type === 'ratings') {
      for (const i of b.items) {
        add(`b:${b.id}:${i.field}:label`, `${where} · ${i.field}`, i.label);
        if (b.type === 'facts') {
          add(`b:${b.id}:${i.field}:format`, `${where} · ${i.field} format`, i.format);
          add(`b:${b.id}:${i.field}:note`, `${where} · ${i.field} note`, i.note);
          add(`b:${b.id}:${i.field}:group`, `${where} · ${i.field} group`, i.group);
        }
      }
    }
    if (b.type === 'choice') b.options.forEach((o) => add(optionRef(b, o), `${where} · ${optionName(o)}`, o.text, true));
  });
  add('footer.disclaimer', 'Footer · disclaimer', def.footer?.disclaimer?.text, true);
  return out;
}

export const optionName = (o) => (o.otherwise ? 'other values' : (o.values ?? []).join(', '));
export const optionRef = (b, o) => `b:${b.id}:o:${o.otherwise ? '*' : (o.values ?? []).join(',')}`;

// ---- Templates --------------------------------------------------------------------

function toTemplate(row) {
  if (!row) return null;
  const definition = JSON.parse(row.definition);
  return {
    ...row,
    active: !!row.active,
    definition,
    fields: fieldsOf(definition),
    conditionFields: conditionFields(definition),
    used_by: db.prepare('SELECT COUNT(*) n FROM products WHERE template_id = ?').get(row.id).n,
  };
}

export const getTemplate = (id) => toTemplate(db.prepare('SELECT * FROM templates WHERE id = ?').get(id));

/** Templates of the given business units (all when bus is undefined). */
export function listTemplates(bus) {
  const rows = db.prepare('SELECT * FROM templates ORDER BY bu_code, name').all();
  return rows.filter((r) => !bus || bus.includes(r.bu_code)).map(toTemplate);
}

// ---- Phrase library ------------------------------------------------------------------

export function listPhrases() {
  const usage = new Map();
  for (const t of db.prepare('SELECT code, definition FROM templates').all()) {
    for (const key of phrasesOf(JSON.parse(t.definition))) usage.set(key, [...(usage.get(key) ?? []), t.code]);
  }
  return db
    .prepare('SELECT * FROM phrases ORDER BY COALESCE(bu_code, \'\'), key')
    .all()
    .map((p) => ({ ...p, used_in: usage.get(p.key) ?? [] }));
}

const getPhrase = (key) => listPhrases().find((p) => p.key === key) ?? null;

/** Shared phrases (no business unit) need a system admin; the others a BU admin for all regions. */
const assertPhraseRights = (user, bu) => assertCan(user, 'bu_admin', ALL, bu ?? ALL);

export function savePhrase(key, input, user, { create = false } = {}) {
  const k = String(key ?? '').trim();
  if (!/^[a-z0-9][a-z0-9_.-]{1,60}$/.test(k)) throw new ValidationError({ key: 'Use 2–60 small letters, digits, dot, - or _' });
  const title = String(input.title ?? '').trim();
  const body = String(input.body ?? '');
  if (!title) throw new ValidationError({ title: 'Title is required' });
  if (!body.trim()) throw new ValidationError({ body: 'Text is required' });
  const bu = input.bu_code ? String(input.bu_code) : null;
  if (bu && !orgExists('bu', bu)) throw new ValidationError({ bu_code: 'Unknown business unit' });

  const before = db.prepare('SELECT * FROM phrases WHERE key = ?').get(k);
  if (create && before) throw new ValidationError({ key: `"${k}" already exists` });
  if (!create && !before) return null;
  if (before) assertPhraseRights(user, before.bu_code);
  assertPhraseRights(user, bu);
  db.prepare(
    `INSERT INTO phrases (key, bu_code, title, body, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET bu_code = excluded.bu_code, title = excluded.title, body = excluded.body,
       updated_at = excluded.updated_at, updated_by = excluded.updated_by`,
  ).run(k, bu, title, body, nowIso(), user.display_name);
  return getPhrase(k);
}

export function deletePhrase(key, user) {
  const p = getPhrase(key);
  if (!p) return false;
  assertPhraseRights(user, p.bu_code);
  if (p.used_in.length) throw new ValidationError({ key: `Used by ${p.used_in.join(', ')}` });
  tx(() => {
    db.prepare("DELETE FROM translations WHERE scope = 'phrase' AND ref = ?").run(key);
    db.prepare('DELETE FROM phrases WHERE key = ?').run(key);
  });
  return true;
}

/** Business units whose active templates use the field (for the field catalog and lookup rights). */
export function fieldUsage() {
  const out = new Map();
  const phrases = loadPhraseBodies();
  for (const t of db.prepare('SELECT code, bu_code, definition FROM templates WHERE active = 1').all()) {
    const def = JSON.parse(t.definition);
    for (const g of fieldsOf(def, phrases)) {
      for (const k of g.keys) {
        const u = out.get(k) ?? { bus: new Set(), templates: new Set() };
        u.bus.add(t.bu_code);
        u.templates.add(t.code);
        out.set(k, u);
      }
    }
  }
  return out;
}
