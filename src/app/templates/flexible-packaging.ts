// Flexible Packaging · standard TDS
//
// A starter built from the standard fields and shared phrases. Adapt it to
// the Flexible Packaging layout before real use.

import { TemplateSource } from './index';
import { productListSection, propertiesSection, safetySection, shelfLifeSection } from './shared-sections';

export const FLEXIBLE_PACKAGING: TemplateSource = {
  code: 'FP-STANDARD',
  bu_code: 'FP',
  name: 'Flexible Packaging · standard TDS',
  description: 'Starter template built from the standard fields. Adapt it to the Flexible Packaging layout before use.',
  definition: {
    style: 'narrow-web',
    docTitle: 'Technical Data Sheet',
    barColor: '#dde3ea',
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
              { id: 'anilox-table', type: 'table', field: 'anilox' },
              { id: 'anilox-notes', type: 'field', field: 'anilox_notes' },
            ],
          },
          { id: 'guidelines', type: 'text', heading: 'Guidelines for use', style: 'guideline', phrase: 'fp.guidelines' },
          { id: 'cleaning', type: 'text', heading: 'Cleaning', phrase: 'cleaning.product', when: { field: 'cleaning_agent', op: 'notEmpty' } },
        ],
      },
      shelfLifeSection(),
      productListSection(),
    ],
    footer: { disclaimer: { phrase: 'disclaimer.advisory' }, company: '**Siegwerk Druckfarben AG & Co. KGaA** – www.siegwerk.com' },
  },
};
