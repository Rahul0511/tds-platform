// Test data for the prototype: made-up products instead of real ones.
//
// A new demo database is filled with these (see seed-demo.js).
//
// The Narrow Web products follow the five kinds of Narrow Web TDS (ink
// series with product list, standard varnish, low-migration varnish,
// adhesive, sleeve white), with invented codes, names and values.

import { db, tx } from './db.js';
import { createProduct } from './products.js';
import { ensureDefaults } from './seed-content.js';

const BY = 'Test data';
const REMARK = 'Test data for the prototype – not a real product';

const lines = (...l) => l.join('\n');

const NW = [
  {
    sales_code: null,
    name: 'TEST LM UV Flexo Ink Series 10 (DEMO)',
    product_type: 'Ink series',
    technology: 'UV (mercury lamps)',
    printing_process: 'Flexo',
    intended_use: 'NPH',
    low_migration: true,
    description: lines(
      'Test data: low-migration, low-odour flexographic ink series designed for curing with UV mercury lamps.',
      'It offers good compatibility with a wide range of plastic materials and other substrates and is suitable for all in-line UV label and packaging printing systems.',
    ),
    safety_notes: lines(
      'The formula of this test series comprises none of the following:',
      '- Basic dye complex pigments with high bleeding tendency.',
      '- Low molecular weight acrylates with potential to leave undesirable contents of free monomer in the cured printed layer.',
      'Note that set-off and migration are dependent on the processing conditions and sufficient barrier properties of the substrate.',
      '## Compliance Management',
      'In the manufacture of food packaging, the printer and/or packer/filler have the responsibility to ensure that there is no migration of concern through the substrate and/or via set-off from the printed outer side to the food contact surface in the stack or the reel.',
    ),
    properties: lines(
      '- Heat sealing: fast colors only shall be used, preliminary test necessary to validate non-bleeding',
      '- suitable for lamination',
      '- silicon free',
      '- deep- and shock-freeze resistant',
    ),
    substrates:
      'Adhesion, resistance to scratching and scuffing, water resistance and resistances to fat, acid or alkaline products, cosmetics, alcohol and cleaning agents are normally obtained on standard label substrates. Specific substrates after technical evaluation.',
    special_applications: lines(
      'These products are in principle suitable for Top-Coat thermal papers.',
      'Principally suitable for thermal transfer and hot foil stamping. Tests with original material under industrial conditions have to be done.',
    ),
    processing_notes: lines(
      '## Overprinting',
      'If higher gloss, better mechanical resistance and/or improved fastness to packaging contents are required, over-printing with a UV-flexo varnish of the same test series is necessary.',
      '## Printing plates',
      'In principle, photopolymer plates are suitable. However, the suitability has to be examined individually.',
    ),
    anilox: [
      ['Highly concentrated process prints:', '360 - 475', '2.2 - 3.0'],
      ['Standard process prints:', '300 - 360', '3.5 - 4.5'],
      ['Line images and/or texts:', '180 - 195', '6.0 - 7.0'],
      ['Intensive solids:', '160 - 180', '7.5 - 8.5'],
      ['Fine lines:', '200 - 320', '4.5 - 6.0'],
    ],
    anilox_notes: 'In case of doubt, please contact in time our technical department.',
    cleaning_agent: 'methoxypropanol',
    shelf_life_months: 12,
    shelf_life_notes: lines('Exceptions:', 'Items marked with (*) in the product list have a shelf life of only 9 months!'),
    product_list: [
      ['Test 10 Process Yellow E13', '99-301001-1', '5', 'Yes', 'Yes', 'Yes', 'Yes'],
      ['Test 10 Process Magenta E13 (**)', '99-301002-2', '5', 'No', 'Yes', 'No', 'Yes'],
      ['Test 10 Process Cyan E13', '99-301003-3', '7-8', 'Yes', 'Yes', 'Yes', 'Yes'],
      ['Test 10 Process Black E13 (*)', '99-301004-4', '7', 'Yes', 'Yes', 'Yes', 'Yes'],
      ['Test 10 Yellow light resist. E13', '99-301005-5', '6-7', 'Yes', 'Yes', 'Yes', 'Yes'],
      ['Test 10 Orange light resist. E13', '99-301006-6', '7', 'Yes', 'Yes', 'Yes', 'Limited'],
      ['Test 10 Warm Red light resist. E13 (***)', '99-301007-7', '6-7', 'Yes', 'Yes', 'Yes', 'Yes'],
      ['Test 10 Rubine Red E13', '99-301008-8', '5', 'No', 'No', 'No', 'No'],
      ['Test 10 Violet E13', '99-301009-9', '6-7', 'Yes', 'Yes', 'Yes', 'No'],
      ['Test 10 Reflex Blue E13', '99-301010-0', '6-7', 'Yes', 'Yes', 'Yes', 'Yes'],
      ['Test 10 Green E13', '99-301011-1', '8', 'Yes', 'Yes', 'Yes', 'Yes'],
      ['Test 10 Transparent White E11', '99-301012-2', '-', 'Yes', 'Yes', 'Yes', 'Yes'],
      ['Test 10 Intensive Black E14 (*)', '99-301013-3', '7', 'Yes', 'Yes', 'Yes', 'Yes'],
    ],
    product_list_special: [
      ['Test 10 Process Yellow ECG E11', '99-302001-1', '5', 'Yes', 'Yes', 'Yes', 'Yes'],
      ['Test 10 Process Magenta ECG E11', '99-302002-2', '5', 'No', 'Yes', 'Yes', 'Yes'],
      ['Test 10 Process Cyan ECG E11', '99-302003-3', '7-8', 'Yes', 'Yes', 'Yes', 'Yes'],
    ],
    product_list_notes: lines(
      '(*) These shades have a shelf life of only 9 months.',
      '(**) These shades are only limited resistant against water.',
      '(***) Special basic inks for particular shades and/or particular fastness properties.',
    ),
  },
  {
    sales_code: '99-100002-2',
    name: 'TEST UV Flexo Gloss Varnish HS (DEMO)',
    product_type: 'Varnish',
    technology: 'UV (mercury lamps)',
    printing_process: 'Flexo',
    intended_use: 'Non-NPH',
    low_migration: false,
    description: 'Test data: high gloss UV flexo overprinting varnish curing by radical mechanism for in- and off-line varnishing.',
    properties: lines('- very good chemical resistances', '- good rub resistance', '- suitable for many synthetic materials including inline corona pre-treated polypropylene', '- high gloss'),
    substrates: lines(
      'Good adhesion and resistances to water, cosmetics, alcohol, cleaning agents and solvents are normally obtained on the following substrates:',
      '- In-line Corona treated polyethylenes with surface tension level of at least 40 - 45 mN/m.',
      '- In-line Corona treated polypropylenes with surface tension level of at least 42 - 45 mN/m.',
      '- Varnished/primered polyethylenes and polypropylenes.',
      '- Coated papers and cardboards.',
      'Other substrates after technical evaluation. Suitability of each substrate has to be tested before the print run.',
    ),
    special_applications: lines(
      'This varnish is not suitable for economic thermal papers due to the darkening of the thermo-sensitive layer.',
      'This varnish is normally not suitable for thermal transfer printability and hot stampability.',
    ),
    cleaning_agent: 'methoxypropanol',
    shelf_life_months: 12,
  },
  {
    sales_code: '99-100003-3',
    name: 'TEST LM UV Flexo Matt Varnish (DEMO)',
    product_type: 'Varnish',
    technology: 'UV (mercury lamps)',
    printing_process: 'Flexo',
    intended_use: 'NPH',
    low_migration: true,
    description: 'Test data: UV flexo matt varnish, radical hardening, **suitable for a wide range of plastic materials and other printing carriers**, for all in-line types of UV-Flexo printing machines.',
    properties: lines(
      '- foil blockable',
      '- good printability with thermo-transfer printing systems*',
      '- low odour, off-flavour and low migration risk',
      '- excellent water and product stabilities',
      '*Testing is recommended due to the wide range of thermal-transfer ribbons available.',
    ),
    substrates: lines(
      'Adhesion, resistance to scratching and scuffing, water resistance and heat-sealing resistance are normally obtained on following label substrates:',
      '- Varnished/primered polyethylene (material for self-adhesive labels).',
      '- PVC-varnished polypropylenes (material for self-adhesive labels).',
      '- Selected treated/primered polyesters.',
      '- Uncoated papers and cardboards with low porosity.',
      'Suitability of each substrate has to be tested before print run.',
    ),
    special_applications: 'As a result of its limited thermal printer hot-smear resistance it is usually not suitable for Top-Coat thermal papers.',
    cleaning_agent: 'methoxypropanol',
    shelf_life_months: 12,
  },
  {
    sales_code: '99-100004-4',
    name: 'TEST Dual Cure Cold Foil Adhesive (DEMO)',
    product_type: 'Adhesive',
    technology: 'Dual cure (UV-LED and mercury)',
    printing_process: 'Flexo',
    intended_use: 'Non-NPH',
    low_migration: false,
    description: 'Test data: LED UV flexo cold foil adhesive for in-line foil stamping, cured via radical polymerization at a wavelength of 395 nm. Suitable for both LED and conventional mercury UV lamps. The product is ready for use directly from the container.',
    properties: '- Adhesive with low viscosity, printability is similar to a laminating adhesive.',
    substrates: lines(
      '- In line Corona pre-treated, orientated polypropylene with min. 40 mN/m surface tension.',
      '- In line Corona pre-treated, orientated polyethylene with min. 40 mN/m surface tension.',
      '- Varnished/primered polypropylene (label material).',
      'Further printing substrates after technical evaluation. Preliminary adhesion tests are recommended.',
    ),
    processing_notes: lines(
      '## Printing Unit',
      'Flexo printing unit equipped with a dedicated lamination module followed by a UV/LED curing unit. Particularly suitable for the wet lamination process.',
      '## Stamping Foil',
      'Use gold and silver cold stamping foils recommended by foil manufacturers for cold foil applications.',
    ),
    anilox: [
      ['Plastic substrates:', '180', '6'],
      ['Paper substrates:', '100', '12'],
    ],
    anilox_notes: 'Recommended anilox roller specifications and minimum application quantity.',
    cleaning_agent: 'methoxypropanol',
    shelf_life_months: 12,
  },
  {
    sales_code: '99-100005-5',
    name: 'TEST LEDTec Sleeve White (DEMO)',
    product_type: 'Opaque white',
    technology: 'Dual cure (UV-LED and mercury)',
    printing_process: 'Flexo',
    intended_use: 'NPH',
    low_migration: false,
    description:
      'Test data: UV-Flexo opaque white for reverse printing on shrinking foils, curing by radical mechanism with UV-LED light at a wavelength of 395 nm and/or UV-mercury arc-lamps (dual cure system). The optimised gliding properties and scratch resistance fulfil the high demands of sleeve-applications.',
    viscosity: '1.15',
    cof_static: 0.2,
    cof_dynamic: 0.15,
    substrates: lines(
      'Adhesion, scratch and scuff resistance and water resistance are obtained on following substrates:',
      '- In-line Corona-treated polyester, with a surface tension of at least 40 - 45 mN/m (dyn).',
      '- In-line Corona-treated polyvinyl-chloride, with a surface tension of at least 42 - 45 mN/m (dyn).',
      '- In-line Corona-treated polystyrene, with a surface tension of at least 42 - 45 mN/m (dyn).',
      'Other substrates after proper technical evaluation.',
    ),
    processing_notes: lines('## Base plates', 'The practise has shown that medium-hard to hard plates in combination with soft tape lead to the best results.'),
    anilox: [['Opaque White:', '120 - 180', '8.0 - 12.0']],
    anilox_notes: 'Please ask your Siegwerk contact person for printing samples of various Anilox specifications.',
    cleaning_agent: 'methoxypropanol',
    shelf_life_months: 12,
  },
];

const SF = [
  {
    sales_code: '99-000001-1',
    name: 'TEST GLOSS VARNISH (DEMO)',
    product_type: 'Varnish',
    technology: 'Water-based',
    printing_process: 'Offset',
    intended_use: 'NPH',
    description: 'Test data: glossy protective coating for demonstrating the TDS prototype. Not a real product.',
    substrates: 'paper and board, coated and absorbent',
    gloss: 8, rub: 7, blocking: 6, drying: 7, cof: 4, hot_foil: 6, foil_lamination: 5, uv_coating: 4, gluability: 6,
    viscosity: '35 - 45 s', density: 1.04, solids: 32, ph: '8,0 - 9,0',
    double_sided: 'yes', heat_resistance: '120 °C', foil_wrapping: 'yes', deep_freezing: 'yes', shelf_life_months: 12,
  },
  {
    sales_code: '99-000002-2',
    name: 'TEST MATT VARNISH (DEMO)',
    product_type: 'Varnish',
    technology: 'Water-based',
    printing_process: 'Offset',
    intended_use: 'NPH',
    description: 'Test data: matt coating with good rub resistance, for demonstrating the TDS prototype. Not a real product.',
    substrates: 'Paper and board, coated',
    gloss: 2, rub: 8, blocking: 7, drying: 6, cof: 6, hot_foil: 4, foil_lamination: 6, uv_coating: null, gluability: 5,
    viscosity: '40 - 50 s', density: 1.04, solids: 28, ph: '7,5 - 8,5',
    double_sided: 'not recommended', heat_resistance: '100 °C', foil_wrapping: 'test recommended', deep_freezing: 'not recommended', shelf_life_months: 6,
  },
  {
    sales_code: '99-000003-3',
    name: 'TEST BARRIER COATING (DEMO)',
    product_type: 'Varnish',
    technology: 'Water-based',
    printing_process: 'Offset',
    intended_use: 'DFC',
    description: 'Test data: barrier coating for demonstrating the TDS prototype. Not a real product.',
    substrates: 'Non absorbent substrates and coated labelpaper',
    gloss: 5, rub: 6, blocking: 8, drying: 5, cof: 3, hot_foil: null, foil_lamination: 4, uv_coating: 3, gluability: 7,
    viscosity: '30 - 40 s', density: 1.2, solids: 40, ph: '8,0 - 9,0',
    double_sided: 'yes', heat_resistance: '150 °C', foil_wrapping: 'not recommended', deep_freezing: 'n.a.', shelf_life_months: 18,
  },
];

const NW_TEMPLATES = ['NW-INK-SERIES', 'NW-VARNISH', 'NW-VARNISH-LM', 'NW-COLD-FOIL-ADHESIVE', 'NW-OPAQUE-WHITE'];

const templateId = (code) => db.prepare('SELECT id FROM templates WHERE code = ?').get(code)?.id;

/** Deletes every product (and its history) and adds the test products. Returns their names. */
export function resetToTestData() {
  ensureDefaults();
  return tx(() => {
    db.prepare("DELETE FROM translations WHERE scope = 'product.field'").run();
    db.prepare('DELETE FROM product_history').run();
    db.prepare('DELETE FROM products').run();

    const add = (region, bu, template, data) =>
      createProduct({ region_code: region, bu_code: bu, template_id: templateId(template), data }, null, REMARK, { by: BY });
    const out = [
      // One product per Narrow Web template, in the order of NW above.
      ...NW.map((p, i) => add('EMEA', 'NW', NW_TEMPLATES[i], p)),
      ...SF.map((p) => add('EMEA', 'SF', 'SF-OPV', p)),
      // The same varnish for the Americas, to show region-based access.
      add('AMER', 'NW', 'NW-VARNISH', { ...NW[1], name: 'TEST UV Flexo Gloss Varnish HS AM (DEMO)' }),
    ];
    return out.map((p) => `${p.region_code}/${p.bu_code} ${p.sales_code ?? p.name}`);
  });
}
