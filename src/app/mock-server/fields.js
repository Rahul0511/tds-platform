// The field catalog: every product field any TDS template can use.
//
// Standard fields (standard: true) mean the same in every business unit, so
// a product number, a shelf life or the intended use is entered and stored
// the same way for Narrow Web, Sheetfed or Flexible Packaging. The other
// fields are specific to the templates of one business unit. A template
// decides which fields its TDS shows; the product form shows exactly those.
//
//   type:    text | textarea | richtext | number | integer | select | boolean | rating | table
//            richtext = paragraphs; "- " bullets, "## " sub-headings, **bold**
//   group:   'identity' = always on the product form, whatever the template
//   lookup:  lookup category the value must come from (controlled input)
//   translatable: the product's text is translated per TDS language
//   columns: for tables; translate: the cells are words to translate (Yes / No)

export const RATING_MAX = 10;

const RESISTANCE_COLUMNS = [
  { key: 'name', label: 'Product name', width: 34 },
  { key: 'number', label: 'Product number', width: 14 },
  { key: 'light', label: 'Lightresistance on woolscale WS ISO 12040', vertical: true, align: 'center' },
  { key: 'alkali', label: 'Alcali-/ Soap-Resistance ISO 2836', vertical: true, align: 'center', translate: true },
  { key: 'alcohol', label: 'Alcohol-Resistance ISO 2836', vertical: true, align: 'center', translate: true },
  { key: 'solvent', label: 'Solvent-Resistance ISO 2836', vertical: true, align: 'center', translate: true },
  { key: 'sterilization', label: 'Sterilization Resistance in Steam 121°C / 45 min', vertical: true, align: 'center', translate: true },
];

export const FIELDS = [
  // ---- Standard fields: the same in every business unit ----
  { key: 'sales_code', label: 'Product number', type: 'text', group: 'identity', standard: true, hint: 'Like 85-622646-9. Leave empty for an ink series.' },
  { key: 'name', label: 'Product name', type: 'text', group: 'identity', standard: true, required: true },
  { key: 'product_type', label: 'Product type', type: 'select', lookup: 'product_type', group: 'identity', standard: true, required: true },
  { key: 'technology', label: 'Technology', type: 'select', lookup: 'technology', group: 'identity', standard: true },
  { key: 'printing_process', label: 'Printing process', type: 'select', lookup: 'printing_process', group: 'identity', standard: true },
  {
    key: 'intended_use',
    label: 'Intended use',
    type: 'select',
    lookup: 'intended_use',
    group: 'identity',
    standard: true,
    required: true,
    hint: 'NPH: suitable for food packaging, pharma or hygiene. DFC: direct food contact.',
  },
  { key: 'low_migration', label: 'Low migration', type: 'boolean', group: 'identity', standard: true },
  { key: 'description', label: 'Description / application', type: 'richtext', standard: true, translatable: true },
  { key: 'properties', label: 'Properties', type: 'richtext', standard: true, translatable: true },
  { key: 'substrates', label: 'Substrates', type: 'richtext', standard: true, translatable: true },
  { key: 'special_applications', label: 'Special applications', type: 'richtext', standard: true, translatable: true },
  { key: 'safety_notes', label: 'Additional product safety information', type: 'richtext', standard: true, translatable: true },
  { key: 'processing_notes', label: 'Printing and processing notes', type: 'richtext', standard: true, translatable: true },
  { key: 'cleaning_agent', label: 'Cleaning agent', type: 'text', standard: true },
  { key: 'viscosity', label: 'Viscosity', type: 'text', standard: true },
  { key: 'density', label: 'Density (g/cm³)', type: 'number', standard: true },
  { key: 'solids', label: 'Solid content (%)', type: 'number', standard: true },
  { key: 'shelf_life_months', label: 'Shelf life (months)', type: 'integer', standard: true, min: 1 },
  { key: 'shelf_life_notes', label: 'Shelf life exceptions', type: 'richtext', standard: true, translatable: true },

  // ---- Flexo (Narrow Web, Flexible Packaging) ----
  { key: 'cof_static', label: 'CoF static (DIN 53375)', type: 'number' },
  { key: 'cof_dynamic', label: 'CoF dynamic (DIN 53375)', type: 'number' },
  {
    key: 'anilox',
    label: 'Anilox rollers',
    type: 'table',
    columns: [
      { key: 'application', label: 'Application', width: 40 },
      { key: 'screen', label: 'Screen [l/cm]' },
      { key: 'volume', label: 'Dip volume [cm³/m²]' },
    ],
  },
  { key: 'anilox_notes', label: 'Anilox notes', type: 'richtext', translatable: true },
  { key: 'product_list', label: 'Product list', type: 'table', columns: RESISTANCE_COLUMNS },
  { key: 'product_list_special', label: 'Product list special shades', type: 'table', columns: RESISTANCE_COLUMNS },
  { key: 'product_list_notes', label: 'Product list notes', type: 'richtext', translatable: true },

  // ---- Sheetfed varnishes ----
  { key: 'gloss', label: 'Gloss', type: 'rating' },
  { key: 'rub', label: 'Rub Resistance', type: 'rating' },
  { key: 'blocking', label: 'Block Resistance', type: 'rating' },
  { key: 'drying', label: 'Drying', type: 'rating' },
  { key: 'cof', label: 'COF', type: 'rating' },
  { key: 'hot_foil', label: 'Hot Foil Stamping', type: 'rating' },
  { key: 'foil_lamination', label: 'Foil Lamination', type: 'rating' },
  { key: 'uv_coating', label: 'UV-Coating', type: 'rating' },
  { key: 'gluability', label: 'Gluability', type: 'rating' },
  { key: 'ph', label: 'pH-value', type: 'select', lookup: 'ph' },
  { key: 'double_sided', label: 'Double sided printing', type: 'select', lookup: 'double_sided' },
  { key: 'heat_resistance', label: 'Heat Resistance', type: 'select', lookup: 'heat_resistance' },
  { key: 'foil_wrapping', label: 'Foil Wrapping', type: 'select', lookup: 'foil_wrapping' },
  { key: 'deep_freezing', label: 'Deep-freezing of printed goods', type: 'select', lookup: 'deep_freezing' },
];

export const FIELD_MAP = new Map(FIELDS.map((f) => [f.key, f]));
export const FIELD_KEYS = FIELDS.map((f) => f.key);
export const IDENTITY_KEYS = FIELDS.filter((f) => f.group === 'identity').map((f) => f.key);

// translatable: the values are words ("yes", "not recommended") that appear
// on the TDS and need a translation; the others are numbers or codes.
// locked: templates choose texts by these values, so they cannot be deleted.
export const LOOKUP_CATEGORIES = [
  { key: 'product_type', label: 'Product type', standard: true, locked: true },
  { key: 'technology', label: 'Technology', standard: true },
  { key: 'printing_process', label: 'Printing process', standard: true },
  { key: 'intended_use', label: 'Intended use', standard: true, locked: true },
  { key: 'ph', label: 'pH' },
  { key: 'double_sided', label: 'Double sided', translatable: true },
  { key: 'heat_resistance', label: 'Heat resistance' },
  { key: 'foil_wrapping', label: 'Foil wrapping', translatable: true },
  { key: 'deep_freezing', label: 'Deep freezing', translatable: true },
];

/** Drop-down values every new database starts with. */
export const DEFAULT_LOOKUPS = {
  product_type: ['Ink series', 'Ink', 'Opaque white', 'Varnish', 'Primer', 'Adhesive', 'Additive'],
  technology: ['UV (mercury lamps)', 'UV-LED', 'Dual cure (UV-LED and mercury)', 'EB', 'Water-based', 'Solvent-based', 'Oxidative'],
  printing_process: ['Flexo', 'Offset', 'Gravure', 'Screen', 'Letterpress', 'Digital'],
  intended_use: ['NPH', 'Non-NPH', 'DFC'],
  ph: ['7,5 - 8,5', '8,0 - 9,0'],
  double_sided: ['yes', 'not recommended', 'n.a.'],
  heat_resistance: ['100 °C', '120 °C', '150 °C'],
  foil_wrapping: ['yes', 'not recommended', 'test recommended'],
  deep_freezing: ['yes', 'not recommended', 'n.a.'],
};

/** Field definitions as sent to the client. */
export const publicFields = () => FIELDS.map((f) => ({ ...f }));
