// The TDS generator: product + template -> render-ready document.
//
// The template says which sections and blocks a TDS has (templates.js); this
// file fills them with the product's values, picks the standard texts,
// translates everything into the document language and leaves out whatever
// has no content, so a TDS never has empty rows or sections. The client only
// lays the result out on A4 pages.
//
// Every text goes through the translator: English is the source, other
// languages come from the translations table and fall back to English.

import { db } from './db.js';
import { FIELD_MAP, LOOKUP_CATEGORIES, RATING_MAX } from './fields.js';
import { BASE_LANG, LABELS, makeTranslator } from './i18n.js';
import { parseRich, toRuns } from './richtext.js';
import { optionRef } from './templates.js';
import { valuesOf } from './products.js';

const isBlank = (v) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && !v.length);

/** Drop-down categories whose values are words to translate. */
const TRANSLATED_LOOKUPS = new Set(LOOKUP_CATEGORIES.filter((c) => c.translatable).map((c) => c.key));

const LOCALES = { EN: 'en-GB', DE: 'de-DE', FR: 'fr-FR' };
const localeOf = (lang) => LOCALES[lang] ?? lang.toLowerCase();

function formatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/** "July 2024" in the document language. */
function formatIssue(iso, lang) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  try {
    const s = new Intl.DateTimeFormat(localeOf(lang), { month: 'long', year: 'numeric' }).format(d);
    return s.charAt(0).toUpperCase() + s.slice(1);
  } catch {
    return `${d.getMonth() + 1}/${d.getFullYear()}`;
  }
}

/** Everything the builder needs that is the same for many products: load once per export. */
export function loadContext(lang = BASE_LANG) {
  const templates = new Map(
    db
      .prepare('SELECT * FROM templates')
      .all()
      .map((t) => [t.id, { ...t, definition: JSON.parse(t.definition) }]),
  );
  return {
    templates,
    phrases: new Map(db.prepare('SELECT key, body FROM phrases').all().map((p) => [p.key, p.body])),
    regions: new Map(db.prepare('SELECT code, name FROM regions').all().map((r) => [r.code, r.name])),
    bus: new Map(db.prepare('SELECT code, name FROM business_units').all().map((b) => [b.code, b.name])),
    company: new Map(
      db
        .prepare("SELECT region_code, bu_code, value FROM scope_settings WHERE key = 'company_line'")
        .all()
        .map((s) => [`${s.region_code}|${s.bu_code}`, s.value]),
    ),
    translator: makeTranslator(lang),
  };
}

/** Does the condition hold for these values? Several conditions must all hold. */
export function passes(when, values) {
  if (!when) return true;
  return (Array.isArray(when) ? when : [when]).every((c) => {
    const v = values[c.field];
    const list = Array.isArray(c.value) ? c.value : c.value === undefined ? [] : [c.value];
    switch (c.op) {
      case 'empty':
        return isBlank(v);
      case 'notEmpty':
        return !isBlank(v);
      case 'yes':
        return v === true;
      case 'no':
        return v === false;
      case 'eq':
        return !isBlank(v) && list.includes(String(v));
      case 'ne':
        return isBlank(v) || !list.includes(String(v));
      case 'in':
        return !isBlank(v) && list.includes(String(v));
      case 'notIn':
        return isBlank(v) || !list.includes(String(v));
      default:
        return true;
    }
  });
}

/**
 * product: a product row (getProduct) or an unsaved draft with the same shape.
 * template: optional, to preview a template that is not saved yet.
 */
export function buildTds(product, ctx = loadContext(), template = ctx.templates.get(Number(product.template_id))) {
  if (!template) throw new Error('The product has no template');
  const def = template.definition;
  const { t, stats } = ctx.translator.start();
  const lang = ctx.translator.lang;
  const values = valuesOf(product);

  const L = (key) => t('label', key, LABELS[key]);
  const T = (ref, text) => (isBlank(text) ? '' : t('template', `${template.code}:${ref}`, text));
  const phrase = (key) => {
    const body = ctx.phrases.get(key);
    return body ? t('phrase', key, body) : '';
  };
  const source = (src, ref) => (src?.phrase ? phrase(src.phrase) : src?.text ? T(ref, src.text) : '');
  const fieldLabel = (key) => t('field', key, FIELD_MAP.get(key)?.label ?? key);

  const decimal = def.numberFormat === 'comma' ? ',' : '.';
  const number = (n) => String(n).replace('.', decimal);

  /** A field value as text in the document language. */
  const display = (key) => {
    const f = FIELD_MAP.get(key);
    const v = values[key];
    if (isBlank(v) || !f) return '';
    switch (f.type) {
      case 'number':
        return number(v);
      case 'boolean':
        return v ? L('yes') : L('no');
      case 'select':
        return TRANSLATED_LOOKUPS.has(f.lookup) ? t('lookup', `${f.lookup}|${v}`, String(v)) : String(v);
      case 'richtext':
      case 'textarea':
        return f.translatable && product.id ? t('product.field', `${product.id}:${key}`, String(v)) : String(v);
      case 'table':
        return '';
      default:
        return String(v);
    }
  };

  const productLine = [values.sales_code, values.name].filter((v) => !isBlank(v)).join(' ');
  const version = product.version ?? 1;
  // Same save-name rule as the Excel tool: code_name_vX_EN
  const fileName = `${values.sales_code ? `${values.sales_code}_` : ''}${values.name ?? ''}_v${version}_${lang}`;
  const special = {
    product: productLine,
    lang: lang.toLowerCase(),
    file: fileName,
    region: product.region_code ?? '',
    bu: product.bu_code ?? '',
  };
  /** {{key}} -> the product's value. Field values first, then the special keys above. */
  const fill = (text) =>
    String(text ?? '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => (FIELD_MAP.has(key) ? display(key) : (special[key] ?? '')));
  const rich = (text) => parseRich(fill(text));

  // ---- Blocks -> render blocks ----
  const heading = (b, out) => {
    if (b.heading) out.push({ kind: 'heading', id: `${b.id}-h`, style: b.style ?? 'normal', text: T(`b:${b.id}:heading`, b.heading) });
  };

  const render = (b, out) => {
    if (!passes(b.when, values)) return;
    switch (b.type) {
      case 'text': {
        const blocks = rich(source(b, `b:${b.id}:text`));
        if (!blocks.length) return;
        heading(b, out);
        out.push({ kind: 'rich', id: b.id, style: b.style ?? 'normal', blocks });
        return;
      }
      case 'field': {
        const f = FIELD_MAP.get(b.field);
        if (!f || isBlank(values[b.field]) || f.type === 'table' || f.type === 'rating') return;
        let blocks;
        if (b.inline) {
          const label = b.label ? T(`b:${b.id}:label`, b.label) : `${fieldLabel(b.field)}:`;
          blocks = [{ type: 'p', runs: [{ t: `${label} `, b: true }, ...toRuns(display(b.field))] }];
        } else {
          blocks = f.type === 'richtext' || f.type === 'textarea' ? rich(display(b.field)) : [{ type: 'p', runs: toRuns(display(b.field)) }];
        }
        if (!blocks.length) return;
        heading(b, out);
        out.push({ kind: 'rich', id: b.id, style: b.style ?? 'normal', blocks });
        return;
      }
      case 'facts': {
        const items = b.items
          .map((i) => {
            const raw = display(i.field);
            if (isBlank(raw)) return null;
            let value = i.format ? T(`b:${b.id}:${i.field}:format`, i.format).replace('{value}', raw) : raw;
            if (i.marker && passes(i.marker.when, values)) value += i.marker.text;
            return {
              label: i.label ? T(`b:${b.id}:${i.field}:label`, i.label) : fieldLabel(i.field),
              value,
              note: i.note ? T(`b:${b.id}:${i.field}:note`, i.note) : undefined,
              group: i.group ? T(`b:${b.id}:${i.field}:group`, i.group) : undefined,
            };
          })
          .filter(Boolean);
        if (!items.length) return;
        heading(b, out);
        out.push({ kind: 'facts', id: b.id, layout: b.layout ?? 'rows', style: b.style ?? 'normal', items });
        return;
      }
      case 'ratings': {
        const items = b.items.map((i) => ({
          key: i.field,
          label: i.label ? T(`b:${b.id}:${i.field}:label`, i.label) : fieldLabel(i.field),
          value: isBlank(values[i.field]) ? null : Number(values[i.field]),
        }));
        if (items.every((i) => i.value === null)) return;
        heading(b, out);
        out.push({ kind: 'ratings', id: b.id, max: RATING_MAX, items });
        return;
      }
      case 'table': {
        const f = FIELD_MAP.get(b.field);
        const rows = values[b.field];
        if (!f || !Array.isArray(rows) || !rows.length) return;
        const columns = f.columns.map((c) => ({
          label: t('field', `${f.key}.${c.key}`, c.label),
          width: c.width ?? null,
          align: c.align ?? 'left',
          vertical: !!c.vertical,
        }));
        const cells = rows.map((r) => r.map((cell, i) => (f.columns[i]?.translate && cell ? t('cell', cell, cell) : cell)));
        heading(b, out);
        out.push({ kind: 'table', id: b.id, style: columns.some((c) => c.vertical) ? 'grid' : 'plain', columns, rows: cells });
        return;
      }
      case 'choice': {
        const v = values[b.field];
        const opt = b.options.find((o) => !isBlank(v) && (o.values ?? []).includes(String(v))) ?? b.options.find((o) => o.otherwise);
        if (!opt) return;
        const blocks = rich(source(opt, optionRef(b, opt)));
        if (!blocks.length) return;
        heading(b, out);
        out.push({ kind: 'rich', id: b.id, style: b.style ?? 'normal', blocks });
        return;
      }
      case 'group': {
        const inner = [];
        b.blocks.forEach((c) => render(c, inner));
        if (!inner.length) return;
        out.push({ kind: 'heading', id: `${b.id}-h`, style: b.style ?? 'normal', text: T(`b:${b.id}:heading`, b.heading) }, ...inner);
        return;
      }
      case 'columns': {
        const columns = b.columns.map((list) => {
          const inner = [];
          list.forEach((c) => render(c, inner));
          return inner;
        });
        if (columns.every((c) => !c.length)) return;
        out.push({ kind: 'columns', id: b.id, columns });
        return;
      }
    }
  };

  // ---- Sections ----
  let n = 0;
  const sections = [];
  for (const s of def.sections) {
    if (!passes(s.when, values)) continue;
    const blocks = [];
    s.blocks.forEach((b) => render(b, blocks));
    if (!blocks.length) continue;
    const numbered = s.numbered !== false && !!s.title;
    sections.push({
      id: s.id,
      number: numbered ? ++n : null,
      title: s.title ? T(`s:${s.id}`, s.title) : null,
      breakBefore: !!s.breakBefore,
      blocks,
    });
  }

  const companyLine = ctx.company.get(`${product.region_code}|${product.bu_code}`) ?? def.footer?.company ?? '';
  const prefix = T('prefix', def.productPrefix);

  const doc = {
    productId: product.id,
    salesCode: values.sales_code ?? '',
    name: values.name ?? '',
    language: lang,
    style: def.style,
    barColor: def.barColor ?? (def.style === 'sheetfed' ? '#b2b2b2' : '#d9d9d9'),
    fitToPage: !!def.fitToPage,
    safetyLogo: def.safetyLogo !== false,
    templateCode: template.code,
    meta: {
      title: T('title', def.docTitle),
      issue: formatIssue(product.modified_at, lang),
      date: formatDate(product.modified_at),
      version,
      region: product.region_code ?? '',
      regionName: ctx.regions.get(product.region_code) ?? '',
      bu: product.bu_code ?? '',
      buName: ctx.bus.get(product.bu_code) ?? '',
      fileName,
      docId: def.docId ? fill(def.docId).replace(/\s+/g, ' ').trim() : fileName,
    },
    labels: {
      productName: L('product_name'),
      issue: L('issue'),
      region: L('region'),
      date: L('date'),
      version: L('version'),
      page: L('page'),
    },
    header: {
      seriesTitle: def.seriesTitle ? [T('series', def.seriesTitle), values.intended_use].filter(Boolean).join(' - ') : '',
      productTitle: [prefix, values.name, values.sales_code].filter((v) => !isBlank(v)).join(' '),
    },
    sections,
    footer: {
      disclaimer: rich(source(def.footer?.disclaimer, 'footer.disclaimer')),
      company: parseRich(companyLine),
    },
  };
  // Counted while building the document above.
  doc.translation = { language: lang, ...stats };
  return doc;
}
