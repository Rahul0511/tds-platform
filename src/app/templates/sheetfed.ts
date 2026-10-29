// Sheetfed · water-based OPV
//
// The layout of TDS_Creator_EN_v6.xlsm: ratings and technical data on page 1,
// product safety on page 2. Page 1 is scaled down to fit (not below 76 %).

import { Condition } from '../core/models';
import { TemplateSource } from './index';

/** foil_wrapping values that get no "*" footnote. */
const FOIL_NOTE_HIDDEN_FOR = ['no', 'not recommended', 'n.a.', 'n.a'];
const FOIL_NOTE: Condition = { field: 'foil_wrapping', op: 'notIn', value: FOIL_NOTE_HIDDEN_FOR };

export const SHEETFED: TemplateSource = {
  code: 'SF-OPV',
  bu_code: 'SF',
  name: 'Sheetfed · water-based OPV',
  description: 'Two pages: product data with ratings, then product safety. Layout of TDS_Creator_EN_v6.xlsm.',
  definition: {
    style: 'sheetfed',
    docTitle: 'TECHNICAL DATA SHEET',
    barColor: '#b2b2b2',
    numberFormat: 'comma',
    fitToPage: true,
    seriesTitle: 'WATER BASED SHEETFED OPV',
    productPrefix: 'FIX RAPID',
    docId: '{{file}}',
    sections: [
      { id: 'description', title: 'Product description', numbered: false, blocks: [{ id: 'description-text', type: 'field', field: 'description' }] },
      {
        id: 'application',
        title: 'Fields of application',
        numbered: false,
        blocks: [
          { id: 'application-text', type: 'text', phrase: 'sf.fields_of_application' },
          { id: 'substrates-line', type: 'field', field: 'substrates', inline: true, label: 'Recommended substrates:' },
        ],
      },
      {
        id: 'performance',
        numbered: false,
        blocks: [
          {
            id: 'performance-grid',
            type: 'columns',
            columns: [
              [
                {
                  id: 'ratings',
                  type: 'ratings',
                  items: [
                    { field: 'gloss' },
                    { field: 'rub' },
                    { field: 'blocking' },
                    { field: 'drying' },
                    { field: 'cof', label: 'COF *' },
                    { field: 'hot_foil' },
                    { field: 'foil_lamination' },
                    { field: 'uv_coating' },
                    { field: 'gluability', label: 'Gluability **' },
                  ],
                },
              ],
              [
                {
                  id: 'technical',
                  type: 'facts',
                  layout: 'rows',
                  items: [
                    { field: 'viscosity', label: 'Viscosity (upon delivery)', note: 'DIN-Cup 4 / 23°C' },
                    { field: 'density', label: 'Mass Density', format: '{value} g/cm³  (+/- 0,04)' },
                    { field: 'solids', label: 'Solid content', format: '{value}%  (+/- 3%)' },
                    { field: 'ph' },
                    { field: 'double_sided' },
                    { field: 'heat_resistance', format: 'up to {value}' },
                    { field: 'foil_wrapping', marker: { text: ' *', when: FOIL_NOTE } },
                    { field: 'deep_freezing' },
                  ],
                },
              ],
            ],
          },
          {
            id: 'notes-grid',
            type: 'columns',
            columns: [
              [{ id: 'rating-notes', type: 'text', style: 'small', phrase: 'sf.rating_notes' }],
              [{ id: 'foil-note', type: 'text', style: 'small', phrase: 'sf.foil_wrapping_note', when: [{ field: 'foil_wrapping', op: 'notEmpty' }, FOIL_NOTE] }],
            ],
          },
          { id: 'lab-disclaimer', type: 'text', style: 'note', phrase: 'sf.lab_disclaimer' },
        ],
      },
      { id: 'processing', title: 'Processing Advise', numbered: false, blocks: [{ id: 'processing-text', type: 'text', phrase: 'sf.processing_advice' }] },
      { id: 'storage', title: 'Storage and handling', numbered: false, blocks: [{ id: 'storage-text', type: 'text', phrase: 'sf.storage_handling' }] },
      { id: 'general', title: 'General Information', numbered: false, blocks: [{ id: 'general-text', type: 'text', phrase: 'sf.general_information' }] },
      {
        id: 'safety',
        title: 'Product safety',
        numbered: false,
        breakBefore: true,
        blocks: [
          {
            id: 'intended-use',
            type: 'group',
            heading: 'Intended Use',
            blocks: [
              {
                id: 'intended-use-text',
                type: 'choice',
                field: 'intended_use',
                options: [
                  { values: ['NPH'], phrase: 'sf.intended.nph' },
                  { values: ['DFC'], phrase: 'sf.intended.dfc' },
                ],
              },
            ],
          },
          {
            id: 'compliance',
            type: 'group',
            heading: 'Compliance Management',
            blocks: [
              { id: 'compliance-intro', type: 'text', phrase: 'sf.compliance_intro' },
              {
                id: 'compliance-text',
                type: 'choice',
                field: 'intended_use',
                options: [
                  { values: ['NPH'], phrase: 'sf.compliance.nph' },
                  { values: ['DFC'], phrase: 'sf.compliance.dfc' },
                ],
              },
            ],
          },
          { id: 'preservatives', type: 'group', heading: 'Information on preservatives', blocks: [{ id: 'preservatives-text', type: 'text', phrase: 'sf.preservatives' }] },
          { id: 'legal-note', type: 'text', style: 'small', phrase: 'sf.legal_note' },
        ],
      },
    ],
    footer: {
      company: 'Siegwerk Druckfarben AG & Co. KGaA - www.siegwerk.com\nSiegwerk Büdingen GmbH – Industriestraße 36 – 63654 Büdingen',
    },
  },
};
