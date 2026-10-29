// Narrow Web · UV flexo TDS
//
// Built from the Narrow Web samples: ink series with product list, standard
// and low-migration varnishes, cold-foil adhesive, sleeve white. The product
// type picks the guidelines, cleaning and shelf-life wording; the intended
// use picks the food-packaging text. So one template covers all of them.

import { TemplateSource } from './index';
import { INKS, VARNISHES, productListSection, propertiesSection, safetySection, shelfLifeSection } from './shared-sections';

export const NARROW_WEB: TemplateSource = {
  code: 'NW-UV-FLEXO',
  bu_code: 'NW',
  name: 'Narrow Web · All product types',
  description: 'One template for every Narrow Web product: the product type and the intended use pick the standard texts. The five templates above follow the sample PDFs more closely.',
  definition: {
    style: 'narrow-web',
    docTitle: 'Technical Datasheet',
    barColor: '#d9d9d9',
    numberFormat: 'dot',
    docId: 'TDS - {{product}}_{{lang}}',
    sections: [
      { id: 'description', title: 'Description / Application', blocks: [{ id: 'description-text', type: 'field', field: 'description' }] },
      safetySection(),
      propertiesSection(),
      {
        id: 'processing',
        title: 'Printing and processing instructions',
        blocks: [
          { id: 'processing-notes', type: 'field', field: 'processing_notes' },
          {
            id: 'anilox',
            type: 'group',
            heading: 'Anilox rollers',
            blocks: [
              { id: 'anilox-intro', type: 'text', phrase: 'nw.anilox_intro', when: { field: 'anilox', op: 'notEmpty' } },
              { id: 'anilox-table', type: 'table', field: 'anilox' },
              { id: 'anilox-notes', type: 'field', field: 'anilox_notes' },
            ],
          },
          {
            id: 'guidelines',
            type: 'choice',
            heading: 'Guidelines for use',
            style: 'guideline',
            field: 'product_type',
            options: [
              { values: INKS, phrase: 'nw.guidelines.inks' },
              { values: VARNISHES, phrase: 'nw.guidelines.varnish' },
              { values: ['Adhesive'], phrase: 'nw.guidelines.adhesive' },
              { otherwise: true, phrase: 'nw.guidelines.inks' },
            ],
          },
          { id: 'ink-selection', type: 'text', phrase: 'nw.varnish.ink_selection', when: { field: 'product_type', op: 'in', value: VARNISHES } },
          { id: 'stir-up', type: 'text', phrase: 'nw.stir_up', when: { field: 'product_type', op: 'in', value: INKS } },
          {
            id: 'sds',
            type: 'choice',
            field: 'product_type',
            options: [
              { values: INKS, phrase: 'nw.sds.inks' },
              { otherwise: true, phrase: 'nw.sds.other' },
            ],
          },
          {
            id: 'cleaning',
            type: 'choice',
            heading: 'Cleaning',
            field: 'product_type',
            when: { field: 'cleaning_agent', op: 'notEmpty' },
            options: [
              { values: INKS, phrase: 'nw.cleaning.inks' },
              { values: VARNISHES, phrase: 'nw.cleaning.varnish' },
              { values: ['Adhesive'], phrase: 'nw.cleaning.adhesive' },
              { otherwise: true, phrase: 'cleaning.product' },
            ],
          },
        ],
      },
      shelfLifeSection(),
      productListSection(),
    ],
    footer: {
      disclaimer: { phrase: 'disclaimer.advisory' },
      company: '**Siegwerk Switzerland AG**, Neuenburgstrasse 48, 3282 Bargen, www.siegwerk.com',
    },
  },
};
