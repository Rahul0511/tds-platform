import type { UiLang } from './i18n/i18n.service';

export type FieldType = 'text' | 'number' | 'integer' | 'rating';

export interface FieldDef {
  key: keyof ProductInput;
  label: string;
  type: FieldType;
  required?: boolean;
  lookup?: string;
}

export interface LookupCategory {
  key: string;
  label: string;
}

export interface Meta {
  fields: FieldDef[];
  lookupCategories: LookupCategory[];
  ratingMax: number;
}

export interface ProductInput {
  sales_code: string;
  designation: string;
  header: string;
  description: string | null;
  substrate: string | null;
  gloss: number | null;
  rub: number | null;
  blocking: number | null;
  drying: number | null;
  cof: number | null;
  hot_foil: number | null;
  foil_lamination: number | null;
  uv_coating: number | null;
  gluability: number | null;
  viscosity: string | null;
  density: number | null;
  solids: number | null;
  ph: string | null;
  double_sided: string | null;
  heat_resistance: string | null;
  foil_wrapping: string | null;
  deep_freezing: string | null;
  shelf_life_months: number | null;
}

export interface Product extends ProductInput {
  id: number;
  version: number;
  modified_at: string;
  modified_by: string | null;
  remarks: string | null;
}

export interface Lookup {
  id: number;
  category: string;
  value: string;
  sort_order: number;
  used_by: number;
}

export interface HeaderRule {
  code: string;
  intended_use: string;
  compliance: string;
  used_by?: number;
}

export interface TextBlock {
  key: string;
  title: string;
  body: string;
  sort_order: number;
  updated_at: string | null;
  updated_by: string | null;
}

export type Settings = Record<string, string>;

export interface HistoryEntry {
  id: number;
  product_id: number | null;
  sales_code: string;
  version: number;
  action: 'created' | 'updated' | 'deleted' | 'imported';
  changed_by: string | null;
  changed_at: string;
  remark: string | null;
  changes: Record<string, [unknown, unknown]> | null;
}

export interface Stats {
  products: number;
  byHeader: { header: string; n: number }[];
  lookups: number;
  textBlocks: number;
  changesLast30Days: number;
  lastChange: string | null;
}

// ---- Render-ready TDS document (built by the server rules) ----

export type DocBlock = { type: 'paragraph'; text: string } | { type: 'list'; items: string[] };

export interface DocSection {
  title: string;
  blocks: DocBlock[];
}

export interface TdsDocument {
  productId?: number;
  salesCode: string;
  language: string;
  meta: { title: string; region: string; date: string; version: number; fileName: string };
  /** Fixed words of the layout, in the document's language. */
  labels: {
    region: string;
    date: string;
    version: string;
    productDescription: string;
    recommendedSubstrates: string;
    productSafety: string;
    intendedUse: string;
    page: string;
  };
  /** 'two': Product safety starts on page 2. 'one': everything on one page. */
  layout: 'one' | 'two';
  /** How many texts fell back to English / still need review / are outdated. */
  translation: { language: string; missing: number; suggested: number; outdated: number };
  seriesTitle: string;
  productTitle: string;
  description: string;
  application: DocSection;
  substrates: string | null;
  ratingMax: number;
  ratings: { key: string; label: string; value: number | null }[];
  ratingNotes: DocBlock[];
  physical: { label: string; value: string; note?: string }[];
  foilNote: DocBlock[] | null;
  labDisclaimer: DocBlock[];
  sections: DocSection[];
  productSafety: { intendedUse: string | null; compliance: DocSection; compliancePhrase: DocBlock[] };
  preservatives: DocSection;
  legal: DocBlock[];
  footer: DocBlock[];
}

export interface ApiError {
  error: string;
  fields?: Record<string, string>;
}

// ---- Users + authorization ----

export type Role = 'viewer' | 'editor' | 'admin';

export interface User {
  id: number;
  username: string;
  display_name: string;
  email: string | null;
  role: Role;
  must_change_password: boolean;
  active: boolean;
  created_at: string;
  last_login_at: string | null;
  /** Language of the app's pages; null until the user has chosen one. */
  ui_language: UiLang | null;
}

export interface UserWithPassword {
  user: User;
  tempPassword: string;
}

export interface AuditEntry {
  id: number;
  at: string;
  actor: string | null;
  action: string;
  target: string | null;
  detail: string | null;
}

// ---- Languages + translations ----

export interface Language {
  code: string;
  name: string;
  active: boolean;
  base: boolean;
  sort_order: number;
}

export type TranslationStatus = 'missing' | 'outdated' | 'suggested' | 'approved';

export interface TranslationItem {
  scope: string;
  ref: string;
  group: string;
  label: string;
  source: string;
  multiline: boolean;
  text: string;
  status: TranslationStatus;
  updated_at: string | null;
  updated_by: string | null;
}

export interface TranslationSummary {
  code: string;
  name: string;
  active: boolean;
  total: number;
  approved: number;
  suggested: number;
  outdated: number;
  missing: number;
}

/** One page of a server-side paged list. */
export interface Page<T> {
  items: T[];
  total: number;
}
