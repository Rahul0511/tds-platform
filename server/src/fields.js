// Single definition of every product field: API validation, Excel import
// and the TDS rules all read from here.
//
//   type:    text | number | integer | rating
//   lookup:  lookup category the value must come from (controlled input)
//   excel:   regex matched against the Masterdata column header

export const RATING_MAX = 10;

export const PRODUCT_FIELDS = [
  { key: 'sales_code', label: 'Sales code', type: 'text', required: true, excel: /^salescode/i },
  { key: 'designation', label: 'Designation', type: 'text', required: true, excel: /^designation/i },
  { key: 'header', label: 'Header', type: 'text', required: true, excel: /^header/i },
  { key: 'description', label: 'Product description', type: 'text', excel: /^product description/i },
  { key: 'substrate', label: 'Recommended substrates', type: 'text', lookup: 'substrate', excel: /^substrates/i },

  { key: 'gloss', label: 'Gloss', type: 'rating', excel: /^gloss/i },
  { key: 'rub', label: 'Rub Resistance', type: 'rating', excel: /^rub/i },
  { key: 'blocking', label: 'Block Resistance', type: 'rating', excel: /^blocking/i },
  { key: 'drying', label: 'Drying', type: 'rating', excel: /^drying/i },
  { key: 'cof', label: 'COF *', type: 'rating', excel: /^cof/i },
  { key: 'hot_foil', label: 'Hot Foil Stamping', type: 'rating', excel: /^hot foil/i },
  { key: 'foil_lamination', label: 'Foil Lamination', type: 'rating', excel: /^foli lam/i },
  { key: 'uv_coating', label: 'UV-Coating', type: 'rating', excel: /^uv-coating/i },
  { key: 'gluability', label: 'Gluability **', type: 'rating', excel: /^gluability/i },

  { key: 'viscosity', label: 'Viscosity (upon delivery)', type: 'text', lookup: 'viscosity', excel: /^visco/i },
  { key: 'density', label: 'Mass Density (g/cm³)', type: 'number', lookup: 'density', excel: /^density/i },
  { key: 'solids', label: 'Solid content (%)', type: 'number', excel: /^solid/i },
  { key: 'ph', label: 'pH-value', type: 'text', lookup: 'ph', excel: /^ph\b/i },
  { key: 'double_sided', label: 'Double sided printing', type: 'text', lookup: 'double_sided', excel: /^double sided/i },
  { key: 'heat_resistance', label: 'Heat Resistance', type: 'text', lookup: 'heat_resistance', excel: /^heat resistance/i },
  { key: 'foil_wrapping', label: 'Foil Wrapping', type: 'text', lookup: 'foil_wrapping', excel: /^foil wrapping/i },
  { key: 'deep_freezing', label: 'Deep-freezing of printed goods', type: 'text', lookup: 'deep_freezing', excel: /^deep freezing/i },
  { key: 'shelf_life_months', label: 'Shelf life (months)', type: 'integer', lookup: 'shelf_life', excel: /^shelf life/i },
];

export const FIELD_KEYS = PRODUCT_FIELDS.map((f) => f.key);

// translatable: the values are words ("yes", "not recommended") that appear
// on the TDS and need a translation; the others are numbers or units.
export const LOOKUP_CATEGORIES = [
  { key: 'substrate', label: 'Substrates', excel: /^substrates$/i, translatable: true },
  { key: 'viscosity', label: 'Viscosity', excel: /^visco/i },
  { key: 'density', label: 'Density', excel: /^density/i },
  { key: 'ph', label: 'pH', excel: /^ph\b/i },
  { key: 'double_sided', label: 'Double sided', excel: /^double sided/i, translatable: true },
  { key: 'heat_resistance', label: 'Heat resistance', excel: /^heat resistance/i },
  { key: 'foil_wrapping', label: 'Foil wrapping', excel: /^foil wrapping/i, translatable: true },
  { key: 'deep_freezing', label: 'Deep freezing', excel: /^deep freezing/i, translatable: true },
  { key: 'shelf_life', label: 'Shelf life (months)', excel: /^shelf life/i },
];
