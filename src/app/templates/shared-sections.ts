// Sections and value lists used by more than one template.

import { TemplateSection } from '../core/models';

/** Product types that get the "ink" wording, and those that get the "varnish" wording. */
export const INKS = ['Ink series', 'Ink', 'Opaque white'];
export const VARNISHES = ['Varnish', 'Primer'];

export const safetySection = (title = 'Product Safety'): TemplateSection => ({
  id: 'safety',
  title,
  blocks: [
    {
      id: 'intended-use',
      type: 'group',
      heading: 'Intended Use',
      blocks: [
        {
          id: 'food-line',
          type: 'choice',
          field: 'intended_use',
          options: [
            { values: ['NPH', 'DFC'], phrase: 'safety.food_line.yes' },
            { values: ['Non-NPH'], phrase: 'safety.food_line.no' },
          ],
        },
      ],
    },
    {
      id: 'safety-text',
      type: 'choice',
      field: 'intended_use',
      options: [
        { values: ['NPH', 'DFC'], phrase: 'safety.nph' },
        { values: ['Non-NPH'], phrase: 'safety.non_nph' },
      ],
    },
    { id: 'know-how', type: 'text', phrase: 'safety.know_how', when: { field: 'intended_use', op: 'notEmpty' } },
    { id: 'safety-notes', type: 'field', field: 'safety_notes' },
  ],
});

export const propertiesSection = (): TemplateSection => ({
  id: 'properties',
  title: 'Properties / Substrates',
  blocks: [
    {
      id: 'properties',
      type: 'group',
      heading: 'Properties',
      blocks: [
        { id: 'properties-text', type: 'field', field: 'properties' },
        {
          id: 'physical',
          type: 'facts',
          layout: 'columns',
          items: [
            { field: 'viscosity', label: 'Viscosity [Pa*s]' },
            { field: 'cof_static', label: 'static', group: 'CoF (DIN 53375)' },
            { field: 'cof_dynamic', label: 'dynamic', group: 'CoF (DIN 53375)' },
          ],
        },
      ],
    },
    { id: 'substrates', type: 'group', heading: 'Substrates', blocks: [{ id: 'substrates-text', type: 'field', field: 'substrates' }] },
    { id: 'special', type: 'group', heading: 'Special applications', blocks: [{ id: 'special-text', type: 'field', field: 'special_applications' }] },
    { id: 'doubt', type: 'text', phrase: 'doubt', when: { field: 'substrates', op: 'notEmpty' } },
  ],
});

export const shelfLifeSection = (): TemplateSection => ({
  id: 'shelf-life',
  title: 'Shelf life',
  blocks: [
    {
      id: 'shelf-life-text',
      type: 'choice',
      field: 'product_type',
      when: { field: 'shelf_life_months', op: 'notEmpty' },
      options: [
        { values: INKS, phrase: 'shelf_life.inks' },
        { values: VARNISHES, phrase: 'shelf_life.varnish' },
        { otherwise: true, phrase: 'shelf_life.product' },
      ],
    },
    { id: 'shelf-life-notes', type: 'field', field: 'shelf_life_notes' },
    { id: 'storage-conditions', type: 'text', phrase: 'shelf_life.conditions' },
  ],
});

export const productListSection = (): TemplateSection => ({
  id: 'product-list',
  title: 'Product list',
  when: { field: 'product_list', op: 'notEmpty' },
  blocks: [
    { id: 'product-list-table', type: 'table', field: 'product_list' },
    { id: 'product-list-special', type: 'table', heading: 'Product list special shades', field: 'product_list_special' },
    { id: 'product-list-notes', type: 'field', field: 'product_list_notes' },
    { id: 'light-resistance', type: 'text', phrase: 'nw.light_resistance' },
  ],
});
