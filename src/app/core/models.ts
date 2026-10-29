import type { UiLang } from './i18n/i18n.service';

// ---- Organisation + access ----

export interface OrgUnit {
  code: string;
  name: string;
  active: boolean;
  sort_order: number;
}

/** Role in a region and business unit, from least to most rights. */
export type ScopeRole = 'viewer' | 'editor' | 'bu_admin';

/** '*' = every region / every business unit. */
export interface Access {
  region_code: string;
  bu_code: string;
  role: ScopeRole;
}

export interface ScopeSetting {
  region_code: string;
  bu_code: string;
  key: string;
  value: string;
}

export interface Org {
  regions: OrgUnit[];
  businessUnits: OrgUnit[];
  settings: ScopeSetting[];
}

// ---- Field catalog ----

export type FieldType = 'text' | 'textarea' | 'richtext' | 'number' | 'integer' | 'select' | 'boolean' | 'rating' | 'table';

export interface TableColumn {
  key: string;
  label: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  vertical?: boolean;
  translate?: boolean;
}

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  group?: 'identity';
  standard?: boolean;
  required?: boolean;
  lookup?: string;
  translatable?: boolean;
  hint?: string;
  min?: number;
  columns?: TableColumn[];
  /** Field catalog only: business units and templates that use the field */
  bus?: string[];
  templates?: string[];
}

export interface LookupCategory {
  key: string;
  label: string;
  standard?: boolean;
  locked?: boolean;
  translatable?: boolean;
}

export interface Meta {
  fields: FieldDef[];
  lookupCategories: LookupCategory[];
  ratingMax: number;
  roles: ScopeRole[];
}

// ---- Products ----

export type FieldValue = string | number | boolean | string[][] | null;

export interface ProductInput {
  region_code: string;
  bu_code: string;
  template_id: number;
  data: Record<string, FieldValue>;
}

export interface Product extends ProductInput {
  id: number;
  sales_code: string | null;
  name: string;
  product_type: string | null;
  template_code: string;
  template_name: string;
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

export interface HistoryEntry {
  id: number;
  product_id: number | null;
  region_code: string;
  bu_code: string;
  sales_code: string | null;
  name: string;
  version: number;
  action: 'created' | 'updated' | 'deleted' | 'imported';
  changed_by: string | null;
  changed_at: string;
  remark: string | null;
  changes: Record<string, [unknown, unknown]> | null;
}

export interface Stats {
  products: number;
  byBu: { bu_code: string; n: number }[];
  byRegion: { region_code: string; n: number }[];
  templates: number;
  phrases: number;
  changesLast30Days: number;
  lastChange: string | null;
}

// ---- Templates + phrases ----

export type ConditionOp = 'eq' | 'ne' | 'in' | 'notIn' | 'empty' | 'notEmpty' | 'yes' | 'no';

export interface Condition {
  field: string;
  op: ConditionOp;
  value?: string | string[];
}

export type BlockStyle = 'normal' | 'small' | 'note' | 'guideline' | 'emphasis';
export type BlockType = 'text' | 'field' | 'facts' | 'ratings' | 'table' | 'choice' | 'group' | 'columns';

export interface FactItem {
  field: string;
  label?: string;
  format?: string;
  note?: string;
  group?: string;
  marker?: { text: string; when?: Condition | Condition[] };
}

export interface ChoiceOption {
  values?: string[];
  otherwise?: boolean;
  phrase?: string;
  text?: string;
}

/** One brick of a template. Which properties apply depends on the type. */
export interface TemplateBlock {
  id: string;
  type: BlockType;
  when?: Condition | Condition[];
  style?: BlockStyle;
  heading?: string;
  phrase?: string;
  text?: string;
  field?: string;
  label?: string;
  inline?: boolean;
  layout?: 'rows' | 'columns';
  items?: FactItem[];
  options?: ChoiceOption[];
  blocks?: TemplateBlock[];
  columns?: TemplateBlock[][];
}

export interface TemplateSection {
  id: string;
  title?: string;
  numbered?: boolean;
  breakBefore?: boolean;
  when?: Condition | Condition[];
  blocks: TemplateBlock[];
}

export type TemplateStyle = 'narrow-web' | 'sheetfed';

export interface TemplateDefinition {
  style: TemplateStyle;
  docTitle: string;
  barColor?: string;
  numberFormat?: 'dot' | 'comma';
  fitToPage?: boolean;
  /** Narrow Web header: show the "Product safety · Transparency" seal (default true) */
  safetyLogo?: boolean;
  seriesTitle?: string;
  productPrefix?: string;
  docId?: string;
  sections: TemplateSection[];
  footer?: { disclaimer?: { phrase?: string; text?: string }; company?: string };
}

export interface Template {
  id: number;
  code: string;
  bu_code: string;
  /** null = for every region */
  region_code: string | null;
  name: string;
  description: string | null;
  definition: TemplateDefinition;
  active: boolean;
  version: number;
  updated_at: string;
  updated_by: string | null;
  used_by: number;
  /** Fields the template prints, grouped by section: drives the product form */
  fields: { section: string; title: string; keys: string[] }[];
  conditionFields: string[];
}

export interface Phrase {
  key: string;
  /** null = shared by every business unit */
  bu_code: string | null;
  title: string;
  body: string;
  updated_at: string | null;
  updated_by: string | null;
  used_in: string[];
}

// ---- Render-ready TDS document (built by the server's generator) ----

export interface Run {
  t: string;
  b?: boolean;
  href?: string;
}

export type DocBlock = { type: 'p'; runs: Run[] } | { type: 'ul'; items: Run[][] } | { type: 'h'; text: string };

export type RenderBlock =
  | { kind: 'rich'; id: string; style: BlockStyle; blocks: DocBlock[] }
  | { kind: 'heading'; id: string; style: BlockStyle; text: string }
  | { kind: 'facts'; id: string; layout: 'rows' | 'columns'; style: BlockStyle; items: { label: string; value: string; note?: string; group?: string }[] }
  | { kind: 'ratings'; id: string; max: number; items: { key: string; label: string; value: number | null }[] }
  | {
      kind: 'table';
      id: string;
      style: 'plain' | 'grid';
      columns: { label: string; width: number | null; align: 'left' | 'center' | 'right'; vertical: boolean }[];
      rows: string[][];
    }
  | { kind: 'columns'; id: string; columns: RenderBlock[][] };

export interface RenderSection {
  id: string;
  number: number | null;
  title: string | null;
  breakBefore: boolean;
  blocks: RenderBlock[];
}

export interface TdsDocument {
  productId?: number;
  salesCode: string;
  name: string;
  language: string;
  style: TemplateStyle;
  barColor: string;
  /** Scale a page down a little instead of starting a new one */
  fitToPage: boolean;
  safetyLogo: boolean;
  templateCode: string;
  meta: {
    title: string;
    issue: string;
    date: string;
    version: number;
    region: string;
    regionName: string;
    bu: string;
    buName: string;
    fileName: string;
    docId: string;
  };
  /** Fixed words of the layout, in the document's language. */
  labels: { productName: string; issue: string; region: string; date: string; version: string; page: string };
  header: { seriesTitle: string; productTitle: string };
  sections: RenderSection[];
  footer: { disclaimer: DocBlock[]; company: DocBlock[] };
  /** How many texts fell back to English / still need review / are outdated. */
  translation: { language: string; missing: number; suggested: number; outdated: number };
}

export interface ApiError {
  error: string;
  fields?: Record<string, string>;
}

// ---- Users ----

export interface User {
  id: number;
  username: string;
  display_name: string;
  email: string | null;
  /** System administrator: users, regions, business units, languages */
  is_admin: boolean;
  access: Access[];
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
  bu: string | null;
  region: string | null;
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
