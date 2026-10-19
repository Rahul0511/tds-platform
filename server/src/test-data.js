// Test data for the prototype: a few made-up products instead of the real ones.
//
// A new, empty database is filled with these (see index.js). To throw away
// all products of an existing database and start again with the test data:
//
//   npm run reset-test-data          (in server/, with the server stopped)
//
// Text blocks, header rules, lookups, translations of the fixed texts and
// users are kept; products, their history and their description
// translations are deleted.

import { pathToFileURL } from 'node:url';
import { db, tx } from './db.js';
import { createProduct } from './products.js';

const BY = 'Test data';
const REMARK = 'Test data for the prototype – not a real product';

// Drop-down values the test products use (added when missing).
const LOOKUPS = {
  substrate: ['paper and board, coated and absorbent', 'Paper and board, coated', 'Non absorbent substrates and coated labelpaper'],
  viscosity: ['30 - 40 s', '35 - 45 s', '40 - 50 s'],
  density: ['1.04', '1.2'],
  ph: ['7,5 - 8,5', '8,0 - 9,0'],
  double_sided: ['yes', 'not recommended', 'n.a.'],
  heat_resistance: ['100 °C', '120 °C', '150 °C'],
  foil_wrapping: ['yes', 'not recommended', 'test recommended'],
  deep_freezing: ['yes', 'not recommended', 'n.a.'],
  shelf_life: ['6', '12', '18'],
};

// Only used when the header does not exist yet (a new database).
const HEADERS = {
  NPH: {
    intended_use: 'is intended for printing on NPH (Nutrition, Pharma and Hygiene) packaging in the EMEA. (Test data)',
    compliance: 'TEST DATA – placeholder text. This is not a valid compliance statement and must not be used for real products.',
  },
  DFC: {
    intended_use: 'is intended for printing on packaging with direct food contact in the EMEA. (Test data)',
    compliance: 'TEST DATA – placeholder text. This is not a valid compliance statement and must not be used for real products.',
  },
};

export const TEST_PRODUCTS = [
  {
    sales_code: '99-000001-1',
    designation: 'TEST GLOSS VARNISH (DEMO)',
    header: 'NPH',
    description: 'Test data: glossy protective coating for demonstrating the TDS prototype. Not a real product.',
    substrate: 'paper and board, coated and absorbent',
    gloss: 8, rub: 7, blocking: 6, drying: 7, cof: 4, hot_foil: 6, foil_lamination: 5, uv_coating: 4, gluability: 6,
    viscosity: '35 - 45 s', density: 1.04, solids: 32, ph: '8,0 - 9,0',
    double_sided: 'yes', heat_resistance: '120 °C', foil_wrapping: 'yes', deep_freezing: 'yes', shelf_life_months: 12,
  },
  {
    sales_code: '99-000002-2',
    designation: 'TEST MATT VARNISH (DEMO)',
    header: 'NPH',
    description: 'Test data: matt coating with good rub resistance, for demonstrating the TDS prototype. Not a real product.',
    substrate: 'Paper and board, coated',
    gloss: 2, rub: 8, blocking: 7, drying: 6, cof: 6, hot_foil: 4, foil_lamination: 6, uv_coating: null, gluability: 5,
    viscosity: '40 - 50 s', density: 1.04, solids: 28, ph: '7,5 - 8,5',
    double_sided: 'not recommended', heat_resistance: '100 °C', foil_wrapping: 'test recommended', deep_freezing: 'not recommended', shelf_life_months: 6,
  },
  {
    sales_code: '99-000003-3',
    designation: 'TEST BARRIER COATING (DEMO)',
    header: 'DFC',
    description: 'Test data: barrier coating for demonstrating the TDS prototype. Not a real product.',
    substrate: 'Non absorbent substrates and coated labelpaper',
    gloss: 5, rub: 6, blocking: 8, drying: 5, cof: 3, hot_foil: null, foil_lamination: 4, uv_coating: 3, gluability: 7,
    viscosity: '30 - 40 s', density: 1.2, solids: 40, ph: '8,0 - 9,0',
    double_sided: 'yes', heat_resistance: '150 °C', foil_wrapping: 'not recommended', deep_freezing: 'n.a.', shelf_life_months: 18,
  },
];

/** Deletes every product (and its history) and adds the test products. Returns their sales codes. */
export function resetToTestData() {
  return tx(() => {
    db.prepare("DELETE FROM translations WHERE scope = 'product.description'").run();
    db.prepare('DELETE FROM product_history').run();
    db.prepare('DELETE FROM products').run();

    const insLookup = db.prepare(
      'INSERT OR IGNORE INTO lookups (category, value, sort_order) VALUES (?, ?, (SELECT COALESCE(MAX(sort_order), 0) + 10 FROM lookups WHERE category = ?))',
    );
    for (const [category, values] of Object.entries(LOOKUPS)) for (const v of values) insLookup.run(category, v, category);
    const insHeader = db.prepare('INSERT OR IGNORE INTO headers (code, intended_use, compliance) VALUES (?, ?, ?)');
    for (const [code, h] of Object.entries(HEADERS)) insHeader.run(code, h.intended_use, h.compliance);

    return TEST_PRODUCTS.map((p) => createProduct(p, BY, REMARK).sales_code);
  });
}

// CLI: npm run reset-test-data
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const before = db.prepare('SELECT COUNT(*) n FROM products').get().n;
  const codes = resetToTestData();
  console.log(`Deleted ${before} product(s). Added ${codes.length} test products: ${codes.join(', ')}`);
}
