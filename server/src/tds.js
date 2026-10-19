// Rules that turn a product row into a render-ready TDS document.
// This replaces the formulas in the hidden CE:DN area of the Excel template.
// Unlike the Excel version, rows without a value are left out, so the PDF
// never contains blank sections.
//
// Every text goes through the translator: English is the source, other
// languages come from the translations table and fall back to English.

import { db } from './db.js';
import { PRODUCT_FIELDS, RATING_MAX } from './fields.js';
import { BASE_LANG, LABELS, makeTranslator } from './i18n.js';
import { FOIL_NOTE_HIDDEN_FOR } from './seed-defaults.js';

const isBlank = (v) => v === null || v === undefined || String(v).trim() === '';
const deNumber = (n) => String(n).replace('.', ',');

function formatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

function fill(template, product) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => (isBlank(product[key]) ? '' : String(product[key])));
}

// "- item" lines become bullets, everything else a paragraph.
function toBlocks(body, product) {
  const out = [];
  for (const raw of fill(body ?? '', product).split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('- ')) {
      const last = out[out.length - 1];
      if (last?.type === 'list') last.items.push(line.slice(2));
      else out.push({ type: 'list', items: [line.slice(2)] });
    } else {
      out.push({ type: 'paragraph', text: line });
    }
  }
  return out;
}

export function loadContext(lang = BASE_LANG) {
  const blocks = Object.fromEntries(db.prepare('SELECT * FROM text_blocks').all().map((b) => [b.key, b]));
  const settings = Object.fromEntries(db.prepare('SELECT key, value FROM settings').all().map((s) => [s.key, s.value]));
  const headers = Object.fromEntries(db.prepare('SELECT * FROM headers').all().map((h) => [h.code, h]));
  return { blocks, settings, headers, translator: makeTranslator(lang) };
}

export function buildTds(product, ctx = loadContext()) {
  const { blocks, settings, headers, translator } = ctx;
  const { t, stats } = translator.start();
  const lang = translator.lang;

  const L = (key) => t('label', key, LABELS[key]);
  const lookup = (category, value) => (isBlank(value) ? value : t('lookup', `${category}|${value}`, String(value)));
  const block = (key) => blocks[key] ?? { title: '', body: '' };
  const blockTitle = (key) => t('block.title', key, block(key).title);
  const blockBody = (key) => t('block.body', key, block(key).body);
  const section = (key) => ({ title: blockTitle(key), blocks: toBlocks(blockBody(key), product) });
  const header = headers[product.header] ?? { intended_use: '', compliance: '' };

  const ratings = PRODUCT_FIELDS.filter((f) => f.type === 'rating').map((f) => ({
    key: f.key,
    label: L(`rating.${f.key}`),
    value: isBlank(product[f.key]) ? null : Number(product[f.key]),
  }));

  // The footnote rule looks at the English drop-down value, before translation.
  const foil = String(product.foil_wrapping ?? '').trim();
  const showFoilNote = !isBlank(foil) && !FOIL_NOTE_HIDDEN_FOR.includes(foil.toLowerCase());
  const foilText = lookup('foil_wrapping', foil);

  const physical = [
    { label: L('phys.viscosity'), value: product.viscosity, note: L('phys.viscosity_note') },
    { label: L('phys.density'), value: isBlank(product.density) ? null : `${deNumber(product.density)} g/cm³  (+/- 0,04)` },
    { label: L('phys.solids'), value: isBlank(product.solids) ? null : `${deNumber(product.solids)}%  (+/- 3%)` },
    { label: L('phys.ph'), value: product.ph },
    { label: L('phys.double_sided'), value: lookup('double_sided', product.double_sided) },
    { label: L('phys.heat_resistance'), value: isBlank(product.heat_resistance) ? null : `${L('up_to')} ${product.heat_resistance}` },
    { label: L('phys.foil_wrapping'), value: isBlank(foil) ? null : showFoilNote ? `${foilText} *` : foilText },
    { label: L('phys.deep_freezing'), value: lookup('deep_freezing', product.deep_freezing) },
  ].filter((row) => !isBlank(row.value));

  const intendedUse = t('header.intended_use', product.header, header.intended_use);
  const description = product.id ? t('product.description', String(product.id), product.description) : product.description;
  const version = product.version ?? 1;

  const doc = {
    productId: product.id,
    salesCode: product.sales_code,
    language: lang,
    meta: {
      title: L('title'),
      region: settings.region ?? '',
      date: formatDate(product.modified_at),
      version,
      // Same save-name rule as the Excel (BA6): code_name_vX_EN
      fileName: `${product.sales_code}_${product.designation}_v${version}_${lang}`,
    },
    labels: {
      region: L('region'),
      date: L('date'),
      version: L('version'),
      productDescription: L('product_description'),
      recommendedSubstrates: L('recommended_substrates'),
      productSafety: L('product_safety'),
      intendedUse: L('intended_use'),
      page: L('page'),
    },
    // 'two': Product safety starts on page 2 (as on the original TDS).
    layout: settings.page_layout === 'one' ? 'one' : 'two',
    seriesTitle: `${t('setting', 'series_title', settings.series_title ?? '')} - ${product.header}`,
    productTitle: `${settings.product_prefix ?? ''} ${product.designation} ${product.sales_code}`.trim(),
    description: description ?? '',
    application: section('fields_of_application'),
    substrates: isBlank(product.substrate) ? null : lookup('substrate', product.substrate),
    ratingMax: RATING_MAX,
    ratings,
    ratingNotes: toBlocks(blockBody('rating_notes'), product),
    physical,
    foilNote: showFoilNote ? toBlocks(blockBody('foil_wrapping_note'), product) : null,
    labDisclaimer: toBlocks(blockBody('lab_disclaimer'), product),
    sections: [section('processing_advice'), section('storage_handling'), section('general_information')].filter((s) => s.blocks.length),
    productSafety: {
      intendedUse: isBlank(header.intended_use) ? null : `${product.sales_code} ${intendedUse}`,
      compliance: section('compliance_intro'),
      compliancePhrase: toBlocks(t('header.compliance', product.header, header.compliance), product),
    },
    preservatives: section('preservatives'),
    legal: toBlocks(blockBody('legal_note'), product),
    footer: toBlocks(blockBody('footer'), product),
  };
  // Counted while building the document above.
  doc.translation = { language: lang, ...stats };
  return doc;
}
