// Content every new demo database starts with: drop-down values and the
// phrase library (both can be edited in the app: Lookups, Phrases). The
// templates are written in code (src/app/templates) and copied into the
// database on every start, see syncTemplates().

import { db, nowIso, tx } from './db.js';
import { DEFAULT_LOOKUPS } from './fields.js';
import { ensureOrg } from './org.js';
import { TEMPLATES } from '../templates/index';

// ---- Phrase library ---------------------------------------------------------
// bu: null = shared by every business unit.

const lines = (...l) => l.join('\n');

export const DEFAULT_PHRASES = [
  // Product safety (shared)
  { key: 'safety.food_line.yes', bu: null, title: 'Food packaging, pharma or hygiene: YES', body: 'Food packaging, pharma, or hygiene: **YES**' },
  { key: 'safety.food_line.no', bu: null, title: 'Food packaging, pharma or hygiene: NO', body: 'Food packaging, pharma, or hygiene: **NO**' },
  {
    key: 'safety.nph',
    bu: null,
    title: 'Safety text · only for food packaging inks',
    body: lines(
      '## Only for food packaging inks',
      'These inks are only suitable for use on the non-food-contact side of food packaging, provided that they are applied using the relevant Good Manufacturing Practices (a system for ensuring that products are consistently produced and controlled according to quality standards) and according to the guidelines in this Technical Data Sheet.',
      'The printer, converter and the packer/filler each have a responsibility to ensure that the finished - printed - article is fit for the intended purpose(s) and that the ink and coating components do not migrate into the food at levels that exceed legal, regulatory and industry defined requirements.',
      'Please refer to Siegwerk\'s "Statement of Composition" for further regulatory information.',
      'In case of specific applications, please contact your technical application service.',
    ),
  },
  {
    key: 'safety.non_nph',
    bu: null,
    title: 'Safety text · not for food packaging',
    body: 'Only acceptable for food packaging if the processing conditions rule out the possibility of set-off in the reel or stack and the design of the final printed article ensures reliable functional barrier properties to migration.',
  },
  {
    key: 'safety.know_how',
    bu: null,
    title: 'Safety text · customer guidance "Know How"',
    body: 'For further information, please refer to Siegwerk\'s Customer Guidance: Printing Inks for Food Packaging ("Know How") on https://www.siegwerk.com/en/our-responsibility/product-responsibility/customer-communications/food-packaging-safety.html in particular chapter 5. "The printer\'s selection of ink" has to be observed.',
  },
  { key: 'doubt', bu: null, title: 'In case of doubt', body: 'In case of doubt, please contact in time our technical department.' },

  // Shelf life (shared)
  {
    key: 'shelf_life.inks',
    bu: null,
    title: 'Shelf life · inks of a series',
    body: 'The inks of this series have under normal conditions a shelf life of **at least {{shelf_life_months}} months**. Within this period the products are usable in conformity with the indications of this data sheet.',
  },
  {
    key: 'shelf_life.varnish',
    bu: null,
    title: 'Shelf life · varnish',
    body: 'This varnish has under normal conditions a shelf life of **at least {{shelf_life_months}} months**. Within this period the product is usable in conformity with the indications of this data sheet.',
  },
  {
    key: 'shelf_life.product',
    bu: null,
    title: 'Shelf life · other products',
    body: 'This product has under normal conditions a shelf life of **at least {{shelf_life_months}} months**. Within this period the product is usable in conformity with the indications of this data sheet.',
  },
  {
    key: 'shelf_life.conditions',
    bu: null,
    title: 'Shelf life · normal conditions',
    body: lines(
      'Normal conditions mean:',
      '- Storage in firmly closed, not yet tapped containers.',
      '- Temperatures not exceeding 20°C for weeks or 25°C for days.',
      '- Do not expose open containers to direct sunlight or strong light sources.',
    ),
  },
  { key: 'cleaning.product', bu: null, title: 'Cleaning · other products', body: 'The product can be removed from tools by using {{cleaning_agent}}.' },
  {
    key: 'disclaimer.advisory',
    bu: null,
    title: 'Footer disclaimer',
    body: lines(
      'Because of the differences in materials for printing, processing conditions and test criteria this Technical Data Sheet can only be of an advisory nature. Our data reflect the latest state of our knowledge and are based on the characteristics established in the laboratory and on practical experience. Your own tests with the original materials under the respective conditions are indispensable.',
      'We disclaim any liability for applications for which this product is not foreseen.',
    ),
  },

  // Narrow Web
  {
    key: 'nw.anilox_intro',
    bu: 'NW',
    title: 'Anilox rollers · introduction',
    body: 'Depending on printing image and substrate e.g. the following or even finer laser-engraved anilox rollers (with doctor blade) can be used:',
  },
  {
    key: 'nw.guidelines.inks',
    bu: 'NW',
    title: 'Guidelines for use · inks',
    body: lines(
      'Before the print job is started, new materials must be checked for compatibility with the inks of this series or with the planned ink-/overprinting varnish combination, even if their suitability on a comparable type of the same substrate group is proved.',
      'The test prints, especially on self-adhesive labels, have to be examined after die-punching (in particular at the edges), for adhesion, resistance to scratching and water (resistance to wet scratching and scuffing), adhesion and scratch resistance after heat-sealing, resistance of the printed ink to the packaging contents and other application-specific requirements.',
      'Due to the post-curing process, these properties may change during the first 24 hours after printing. Therefore please make a re-check after one day.',
      'Consequently, for every new job in which printing is done on a known material, but with untested ink and printing combinations, the aforementioned tests have to be carried out as well.',
    ),
  },
  {
    key: 'nw.guidelines.varnish',
    bu: 'NW',
    title: 'Guidelines for use · varnishes',
    body: lines(
      'Before the print job is started, new materials must be checked for compatibility with the planned varnish/inks combination, even if their suitability on a comparable type of the same substrate group is proved.',
      'The test prints, especially on self-adhesive labels, have to be examined after die-punching (in particular at the edges) for adhesion, resistance to scratching and water (resistance to wet scratching and scuffing), resistance to the packaging contents and other job-specific requirements. Due to possible different material shrinkage and other alterations, these examinations must be repeated after one day.',
      'Levelling/printability, mechanical resistances (e.g. adhesion, folding resistance, punching resistance), resistance to water and the weather, and in particular the resistances to the packaged products, depend largely on the properties of the pre-printed inks. The latter is particularly applicable if the ink film on the punching edge is exposed, and hence subject to lateral attack.',
      'Consequently, for every new job in which printing is done on a known material, but with untested ink and printing combinations, the aforementioned tests have to be carried out as well.',
    ),
  },
  {
    key: 'nw.guidelines.adhesive',
    bu: 'NW',
    title: 'Guidelines for use · adhesives',
    body: lines(
      'Prior to starting a print job, all new materials must be tested for compatibility with the intended laminating adhesive and ink combination, even if suitability has already been demonstrated on a comparable substrate within the same material group.',
      'Test prints, especially on self-adhesive labels, must be evaluated after die-cutting (particularly at the edges) for bond strength. Where required, additional testing should be carried out to assess resistance to water, packaging contents, and other job-specific conditions.',
      'Due to potential material shrinkage or other changes, these evaluations must be repeated after 24 hours.',
      'Accordingly, for every new job involving a known substrate but a new combination of inks and printing parameters, the above tests must be performed.',
    ),
  },
  {
    key: 'nw.guidelines.opaque_white',
    bu: 'NW',
    title: 'Guidelines for use · opaque whites',
    body: lines(
      'Before the print job is started, new materials must be checked for compatibility with the opaque white inks of this series or with the planned ink-/overprinting varnish combination, even if their suitability on a comparable type of the same substrate group is proved.',
      'The test prints, especially on self-adhesive labels, have to be examined after die-punching (in particular at the edges), for adhesion, resistance to scratching and water (resistance to wet scratching and scuffing), adhesion and scratch resistance after heat-sealing, resistance of the printed ink to the packaging contents and other application-specific requirements.',
      'Due to the post-curing process, these properties may change during the first 24 hours after printing. Therefore please make a re-check after one day.',
      'Consequently, for every new job in which printing is done on a known material, but with untested ink and printing combinations, the aforementioned tests have to be carried out as well.',
    ),
  },
  {
    key: 'nw.varnish.ink_selection',
    bu: 'NW',
    title: 'Varnishes · selection of the printing inks',
    body: lines(
      'Optimum performance is achieved by using the following criteria in the selection of the printing inks:',
      '- Preferably radical UV-Letterpress, UV-Offset, UV-Screen printing or UV-Flexo inks.',
      '- Best possible adhesion and resistance to water on the substrate to be printed.',
      '- Best possible resistance of the printing ink series used to the packaged product.',
      '- Exclusion of specific shades which contain pigments with poor fastness to the specified packaging content, e.g. poor light and weather fastness.',
    ),
  },
  {
    key: 'nw.stir_up',
    bu: 'NW',
    title: 'Stir up before use',
    body: 'Stir up well each ink or varnish before use. Mainly whites, colours containing white, varnishes, lacquers, mat varnishes as well as gold and silver inks show sedimentation of essential components.',
  },
  {
    key: 'nw.sds.inks',
    bu: 'NW',
    title: 'Safety data sheets · inks',
    body: 'Do not handle products without having consulted the corresponding safety data sheets. We supply them together with the first shipment.',
  },
  { key: 'nw.sds.other', bu: 'NW', title: 'Safety data sheets · other products', body: 'Please see also the information on the material safety datasheet.' },
  {
    key: 'nw.cleaning.inks',
    bu: 'NW',
    title: 'Cleaning · UV inks',
    body: lines('The inks can be removed from rollers and tools by using {{cleaning_agent}}.', 'Reactive UV thinners are not suitable for cleaning.'),
  },
  { key: 'nw.cleaning.varnish', bu: 'NW', title: 'Cleaning · varnishes', body: 'The varnish can be removed from tools by using {{cleaning_agent}}.' },
  { key: 'nw.cleaning.adhesive', bu: 'NW', title: 'Cleaning · adhesives', body: 'The adhesive can be removed from tools by using {{cleaning_agent}}.' },
  {
    key: 'nw.light_resistance',
    bu: 'NW',
    title: 'Product list · light resistance',
    body: lines(
      '## Light Resistance',
      'The light fastness values refer to a solid tone printing. Light fastness decreases when colour strength is reduced or if colours are intermixed.',
      'This applies also to other resistances mentioned in the product list.',
      'This TDS is also valid for all color blends that consist of the listed basic components. The lightfastness and resistances of a blend always refers to the lowest or weakest property of the individual components used.',
    ),
  },

  // Sheetfed (wording of the BasisFormular sheet of TDS_Creator_EN_v6.xlsm)
  {
    key: 'sf.fields_of_application',
    bu: 'SF',
    title: 'Fields of application',
    body: 'Sheet-fed offset printing presses with coating unit (anilox roller / chamber doctor blade) and suitable drying unit',
  },
  {
    key: 'sf.rating_notes',
    bu: 'SF',
    title: 'Rating footnotes',
    body: lines(
      '*   From slippery to antislip (left to right)',
      '** The adhesive used should be recommended for varnished surfaces. Due to the reduced absorbency of a varnished surface, it is always better to leave out the adhesive flap. A test under practical conditions is recommended',
    ),
  },
  {
    key: 'sf.foil_wrapping_note',
    bu: 'SF',
    title: 'Foil wrapping footnote',
    body: lines('*  For Uncoated PP (110°C / 10kPas / 1 sec)', 'Coated films should tested under practical conditions', 'Acrylic coated films are not suitable'),
  },
  {
    key: 'sf.lab_disclaimer',
    bu: 'SF',
    title: 'Laboratory disclaimer',
    body: 'Please note: all specified values and properties have been determined by laboratory tests under defined conditions. The properties may also deviate slightly under different practical conditions.',
  },
  {
    key: 'sf.processing_advice',
    bu: 'SF',
    title: 'Processing Advise',
    body: lines(
      '- Stir well before use',
      '- Recommended application weight: 4-6g/m² (wet)',
      '- Do not mix with other products',
      '- Only use solvent and alkali resistant inks. Unsuitable inks may bleed or change shade after varnishing',
      '- Only use ant set-off powders which are recommended for use with water-based OPVs',
      '- A delivery pile temperature of 35°C should not be exceeded, as this can otherwise lead to set off and blocking',
      '- Wash pipes and application units with water or, if necessary, with water / cleaning agent 19-470823-6. Avoid contamination of the coating with rinsing water. Dried coating residues can be removed with pure cleaner (observe safety instructions).',
    ),
  },
  {
    key: 'sf.storage_handling',
    bu: 'SF',
    title: 'Storage and handling',
    body: lines(
      '- Store in a frost free and cool place',
      '- Store in the unopened original container. After opening, use as quickly as possible.',
      '- Shelf life: {{shelf_life_months}} months in unopened container, consume as soon as possible after opening',
      '- the viscosity may increase during storage. Before use stir well, check viscosity and dilute with a maximum of 5% water if necessary.',
    ),
  },
  {
    key: 'sf.general_information',
    bu: 'SF',
    title: 'General Information',
    body: lines(
      '- the final surface properties only develop after the ink and varnish have completely dried.',
      '- If the contents of the packaging or processing aids affect the coating surface after printing, the suitability must be tested separately',
      '- Finishing with UV-varnish or hot foil requires a stable substrate surface. Metallic inks must be tape-resistant',
      '- The adhesion and scratch resistance of the UV varnish or hot foil stamping can vary depending on the surface properties of the substrate, the ink and the UV varnish or hot foil applied',
      '- Suitability for double-sided printing is influenced not only by the coating properties but also by the substrate, high ink coverage and slow-setting inks. We recommend a sufficient drying time before reprinting and a test under practical conditions.',
      '- The substrates used must be suitable for coating with aqueous OPVs.',
    ),
  },
  {
    key: 'sf.intended.nph',
    bu: 'SF',
    title: 'Intended use · NPH',
    body: '{{sales_code}} is intended for printing on NPH (Nutrition, Pharma and Hygiene) packaging in the EMEA.',
  },
  {
    key: 'sf.intended.dfc',
    bu: 'SF',
    title: 'Intended use · DFC',
    body: '{{sales_code}} is intended for printing on packaging with direct food contact in the EMEA.',
  },
  {
    key: 'sf.compliance_intro',
    bu: 'SF',
    title: 'Compliance Management',
    body: lines(
      'For compliance with European food packaging legislation, please refer to the customer guide "Printing inks for food packaging":',
      'https://ink-safety-portal.siegwerk.com/regulatory-affairs/compliance.html',
    ),
  },
  {
    key: 'sf.compliance.nph',
    bu: 'SF',
    title: 'Compliance text · NPH',
    body: lines(
      'Further regulatory information can be found in Siegwerk\'s "Statement of Composition".',
      'The product is suitable for use on the non-food contact side of food packaging provided it is used in accordance with the relevant Good Manufacturing Practices (GMP) and in accordance with the information in this Technical Data Sheet. Application on the food contact side is not recommended.',
      'The printer, converter and packer/filler are legally responsible for ensuring that the finished article is suitable for the intended purpose(s) and that the ink and coating components do not migrate into the food in quantities that exceed legal and industry requirements.',
    ),
  },
  {
    key: 'sf.compliance.dfc',
    bu: 'SF',
    title: 'Compliance text · DFC',
    body: lines(
      'Further regulatory information can be found in Siegwerk\'s "Statement of Composition".',
      'The product is suitable for use on the non-food contact side of food packaging provided it is used in accordance with the relevant Good Manufacturing Practices (GMP) and in accordance with the information in this Technical Data Sheet. Application on the food contact side is only recommended for dry foods and dry and fatty foods. Additionally, an individual migration test under practical conditions (due to high variety of substrates and application weights) is mandatory. The printer, converter and packer/filler are legally responsible for ensuring that the finished article is suitable for the intended purpose(s) and that the ink and coating components do not migrate into the food in quantities that exceed legal and industry requirements. For information on the food legislation assessment of this product, please contact our PSR-Department.',
      'Email: psr-emea@siegwerk.com',
    ),
  },
  {
    key: 'sf.preservatives',
    bu: 'SF',
    title: 'Information on preservatives',
    body: 'Water-based products typically contain as in-can preservatives. The product contains isothiazolinone biocides, traces of methyl isothiazolinone (MIT) cannot be excluded. Such biocides may cause allergic skin reactions in already sensitized individuals.',
  },
  {
    key: 'sf.legal_note',
    bu: 'SF',
    title: 'Legal note',
    body: lines(
      'Note: The information in this brochure reflects our current state of knowledge. It does not constitute a guarantee in the legal sense. Due to the different substrates and production conditions, this information sheet is only intended as non-binding advice. Before printing, the printer should carry out suitable tests to determine the suitability of the product for the intended purpose. This data sheet does not claim to be complete.',
      'We reserve the right to make changes to the product properties due to technical developments, changes in applicable law and production-related requirements.',
    ),
  },

  // Flexible Packaging (starter wording, to be replaced by the BU)
  {
    key: 'fp.guidelines',
    bu: 'FP',
    title: 'Guidelines for use',
    body: lines(
      'Before the print job is started, new materials must be checked for compatibility with the inks of this series, even if their suitability on a comparable type of the same substrate group is proved.',
      'For every new job with untested ink and printing combinations, adhesion, resistances and further application-specific requirements have to be tested before production.',
    ),
  },
];

// ---- Seeding -------------------------------------------------------------------------

// Each step runs once per database, so content somebody deleted on purpose
// is not brought back. Phrases added to the code later are added.
const SEED_VERSION = 1;

export function ensureDefaults() {
  ensureOrg();
  const done = Number(db.prepare("SELECT value FROM settings WHERE key = 'content_seeded'").get()?.value ?? 0);
  tx(() => {
    if (done < SEED_VERSION) {
      const insLookup = db.prepare('INSERT OR IGNORE INTO lookups (category, value, sort_order) VALUES (?, ?, ?)');
      for (const [category, values] of Object.entries(DEFAULT_LOOKUPS)) values.forEach((v, i) => insLookup.run(category, v, (i + 1) * 10));
      db.prepare("INSERT INTO settings (key, value) VALUES ('content_seeded', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(String(SEED_VERSION));
    }
    const insPhrase = db.prepare('INSERT OR IGNORE INTO phrases (key, bu_code, title, body, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?)');
    for (const p of DEFAULT_PHRASES) insPhrase.run(p.key, p.bu, p.title, p.body, nowIso(), 'starter set');
  });
  syncTemplates();
}

/**
 * The templates of src/app/templates are the source: a new one is added, a
 * changed one is updated (version + 1). Templates are not edited in the app.
 */
export function syncTemplates() {
  tx(() => {
    for (const t of TEMPLATES) {
      const definition = JSON.stringify(t.definition);
      const row = db.prepare('SELECT * FROM templates WHERE code = ?').get(t.code);
      if (!row) {
        db.prepare(
          `INSERT INTO templates (code, bu_code, region_code, name, description, definition, active, version, updated_at, updated_by)
           VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?, 'template file')`,
        ).run(t.code, t.bu_code, t.region_code ?? null, t.name, t.description, definition, nowIso());
      } else if (row.definition !== definition || row.name !== t.name || row.description !== t.description || row.bu_code !== t.bu_code || row.region_code !== (t.region_code ?? null)) {
        db.prepare(
          `UPDATE templates SET bu_code = ?, region_code = ?, name = ?, description = ?, definition = ?, active = 1,
             version = version + 1, updated_at = ?, updated_by = 'template file' WHERE id = ?`,
        ).run(t.bu_code, t.region_code ?? null, t.name, t.description, definition, nowIso(), row.id);
      }
    }
  });
}
