// Narrow Web templates, one per kind of Narrow Web TDS, each following its
// sample PDF:
//
//   NW-INK-SERIES          SICURA Nutriflex 10 (ink series with product list)
//   NW-OPAQUE-WHITE        81-000589-2 Nutriflex LEDTec Sleevewhite E03
//   NW-VARNISH             85-622646-9 Flex Gloss Varnish HS E51
//   NW-VARNISH-LM          85-622894-5 Nutriflex Matt Varnish FBL E03 (low migration)
//   NW-COLD-FOIL-ADHESIVE  85-622855-6 Flex Dual Cure Cold Foil Adhesive E01
//
// They share the layout, header, footer and most sections; the differences
// are the document title, the order of the processing texts, the wording
// of the guidelines and whether the product list or anilox table appears.

import { TemplateBlock, TemplateDefinition, TemplateSection } from '../core/models';
import { TemplateSource } from './index';
import { productListSection, propertiesSection, safetySection, shelfLifeSection } from './shared-sections';

const description = (): TemplateSection => ({
  id: 'description',
  title: 'Description / Application',
  blocks: [{ id: 'description-text', type: 'field', field: 'description' }],
});

const footer = {
  disclaimer: { phrase: 'disclaimer.advisory' },
  company: '**Siegwerk Switzerland AG**, Neuenburgstrasse 48, 3282 Bargen, www.siegwerk.com',
};

/** Layout of every Narrow Web TDS; title, document id and sections differ. */
const sheet = (docTitle: string, docId: string, sections: TemplateSection[], extra: Partial<TemplateDefinition> = {}): TemplateDefinition => ({
  style: 'narrow-web',
  docTitle,
  barColor: '#d9d9d9',
  numberFormat: 'dot',
  docId,
  sections,
  footer,
  ...extra,
});

const anilox = (withIntro: boolean): TemplateBlock => ({
  id: 'anilox',
  type: 'group',
  heading: 'Anilox rollers',
  blocks: [
    ...(withIntro ? [{ id: 'anilox-intro', type: 'text', phrase: 'nw.anilox_intro', when: { field: 'anilox', op: 'notEmpty' } } as TemplateBlock] : []),
    { id: 'anilox-table', type: 'table', field: 'anilox' },
    { id: 'anilox-notes', type: 'field', field: 'anilox_notes' },
  ],
});

const guidelines = (phrase: string, heading = 'Guidelines for use'): TemplateBlock => ({ id: 'guidelines', type: 'text', heading, style: 'guideline', phrase });

const cleaning = (phrase: string): TemplateBlock => ({
  id: 'cleaning',
  type: 'text',
  heading: 'Cleaning',
  phrase,
  when: { field: 'cleaning_agent', op: 'notEmpty' },
});

const processing = (blocks: TemplateBlock[]): TemplateSection => ({ id: 'processing', title: 'Printing and processing instructions', blocks });

// ---- Ink series (SICURA Nutriflex 10) ----------------------------------------------

export const NW_INK_SERIES: TemplateSource = {
  code: 'NW-INK-SERIES',
  bu_code: 'NW',
  name: 'Narrow Web · Ink series with product list',
  description: 'Like SICURA Nutriflex 10: ink series with anilox table, product list and special shades.',
  definition: sheet('Technical Datasheet', 'TDS – {{product}}_{{lang}}', [
    description(),
    safetySection(),
    propertiesSection(),
    processing([
      { id: 'processing-notes', type: 'field', field: 'processing_notes' },
      anilox(true),
      guidelines('nw.guidelines.inks'),
      { id: 'stir-up', type: 'text', phrase: 'nw.stir_up' },
      { id: 'sds', type: 'text', phrase: 'nw.sds.inks' },
      cleaning('nw.cleaning.inks'),
    ]),
    {
      id: 'shelf-life',
      title: 'Shelf life',
      blocks: [
        { id: 'shelf-life-text', type: 'text', phrase: 'shelf_life.inks', when: { field: 'shelf_life_months', op: 'notEmpty' } },
        { id: 'shelf-life-notes', type: 'field', field: 'shelf_life_notes' },
        { id: 'storage-conditions', type: 'text', phrase: 'shelf_life.conditions' },
      ],
    },
    productListSection(),
  ]),
};

// ---- Opaque white (Nutriflex LEDTec Sleevewhite) -----------------------------------------

export const NW_OPAQUE_WHITE: TemplateSource = {
  code: 'NW-OPAQUE-WHITE',
  bu_code: 'NW',
  name: 'Narrow Web · Opaque white',
  description: 'Like Nutriflex LEDTec Sleevewhite: viscosity and CoF table, guidelines with the substrates, anilox and base plates.',
  definition: sheet('Technical Datasheet', 'TDS-{{product}}_{{lang}}', [
    description(),
    safetySection(),
    {
      ...propertiesSection(),
      // The guidelines follow the substrates in this layout.
      blocks: [...propertiesSection().blocks.filter((b) => b.id !== 'doubt'), guidelines('nw.guidelines.opaque_white')],
    },
    processing([
      anilox(false),
      { id: 'processing-notes', type: 'field', field: 'processing_notes' },
      { id: 'stir-up', type: 'text', phrase: 'nw.stir_up' },
      { id: 'sds', type: 'text', phrase: 'nw.sds.inks' },
      cleaning('nw.cleaning.inks'),
    ]),
    {
      id: 'shelf-life',
      title: 'Shelf life',
      blocks: [
        { id: 'shelf-life-text', type: 'text', phrase: 'shelf_life.inks', when: { field: 'shelf_life_months', op: 'notEmpty' } },
        { id: 'shelf-life-notes', type: 'field', field: 'shelf_life_notes' },
        { id: 'storage-conditions', type: 'text', phrase: 'shelf_life.conditions' },
      ],
    },
  ]),
};

// ---- Varnishes (Flex Gloss Varnish HS, Nutriflex Matt Varnish FBL) -------------------------

const varnishSections = (): TemplateSection[] => [
  description(),
  safetySection(),
  propertiesSection(),
  processing([
    { id: 'processing-notes', type: 'field', field: 'processing_notes' },
    guidelines('nw.guidelines.varnish'),
    { id: 'ink-selection', type: 'text', style: 'guideline', phrase: 'nw.varnish.ink_selection' },
    { id: 'sds', type: 'text', phrase: 'nw.sds.other' },
    cleaning('nw.cleaning.varnish'),
  ]),
  {
    id: 'shelf-life',
    title: 'Shelf life',
    blocks: [
      { id: 'shelf-life-text', type: 'text', phrase: 'shelf_life.varnish', when: { field: 'shelf_life_months', op: 'notEmpty' } },
      { id: 'shelf-life-notes', type: 'field', field: 'shelf_life_notes' },
      { id: 'storage-conditions', type: 'text', phrase: 'shelf_life.conditions' },
    ],
  },
];

export const NW_VARNISH: TemplateSource = {
  code: 'NW-VARNISH',
  bu_code: 'NW',
  name: 'Narrow Web · Varnish',
  description: 'Like Flex Gloss Varnish HS: overprint varnish with ink-selection criteria, no anilox table.',
  definition: sheet('Technical Datasheet', 'TI - {{product}}_{{lang}}', varnishSections()),
};

export const NW_VARNISH_LM: TemplateSource = {
  code: 'NW-VARNISH-LM',
  bu_code: 'NW',
  name: 'Narrow Web · Low-migration varnish',
  description: 'Like Nutriflex Matt Varnish FBL: low-migration varnish for food packaging, titled "Technical Information".',
  definition: sheet('Technical Information', 'TI - {{product}}_{{lang}}', varnishSections()),
};

// ---- Cold foil adhesive (Flex Dual Cure Cold Foil Adhesive) ---------------------------------

export const NW_COLD_FOIL_ADHESIVE: TemplateSource = {
  code: 'NW-COLD-FOIL-ADHESIVE',
  bu_code: 'NW',
  name: 'Narrow Web · Cold foil adhesive',
  description: 'Like Flex Dual Cure Cold Foil Adhesive: printing unit and stamping foil notes, "To observe" instead of guidelines, no Transparency seal.',
  definition: sheet(
    'Technical Information',
    'TI - {{product}}_{{lang}}',
    [
      description(),
      safetySection(),
      propertiesSection(),
      processing([
        { id: 'processing-notes', type: 'field', field: 'processing_notes' },
        anilox(false),
        guidelines('nw.guidelines.adhesive', 'To observe:'),
        { id: 'sds', type: 'text', phrase: 'nw.sds.other' },
        cleaning('nw.cleaning.adhesive'),
      ]),
      {
        id: 'shelf-life',
        title: 'Shelf life',
        blocks: [
          { id: 'shelf-life-text', type: 'text', phrase: 'shelf_life.product', when: { field: 'shelf_life_months', op: 'notEmpty' } },
          { id: 'shelf-life-notes', type: 'field', field: 'shelf_life_notes' },
          { id: 'storage-conditions', type: 'text', phrase: 'shelf_life.conditions' },
        ],
      },
    ],
    { safetyLogo: false },
  ),
};

export const NARROW_WEB_SHEETS = [NW_INK_SERIES, NW_OPAQUE_WHITE, NW_VARNISH, NW_VARNISH_LM, NW_COLD_FOIL_ADHESIVE];
