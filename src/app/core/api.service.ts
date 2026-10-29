import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import {
  Access,
  AuditEntry,
  FieldDef,
  HistoryEntry,
  Language,
  Lookup,
  Meta,
  Org,
  OrgUnit,
  Page,
  Phrase,
  Product,
  ProductInput,
  ScopeSetting,
  Stats,
  TdsDocument,
  Template,
  TranslationItem,
  TranslationSummary,
  User,
  UserWithPassword,
} from './models';

/** Optional filters of product lists and exports. Empty values are left out. */
export interface ProductFilter {
  search?: string;
  region?: string;
  bu?: string;
  template?: number | string;
}

type UserInput = Pick<User, 'display_name' | 'email' | 'is_admin' | 'access'> & { username?: string };

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = '/api';

  readonly meta$: Observable<Meta> = this.http.get<Meta>(`${this.base}/meta`).pipe(shareReplay(1));

  stats() {
    return this.http.get<Stats>(`${this.base}/stats`);
  }

  // Organisation
  org() {
    return this.http.get<Org>(`${this.base}/org`);
  }
  addOrgUnit(kind: 'regions' | 'business-units', unit: Pick<OrgUnit, 'code' | 'name'>) {
    return this.http.post<OrgUnit>(`${this.base}/${kind}`, unit);
  }
  updateOrgUnit(kind: 'regions' | 'business-units', code: string, data: Partial<Pick<OrgUnit, 'name' | 'active'>>) {
    return this.http.put<OrgUnit>(`${this.base}/${kind}/${encodeURIComponent(code)}`, data);
  }
  deleteOrgUnit(kind: 'regions' | 'business-units', code: string) {
    return this.http.delete<void>(`${this.base}/${kind}/${encodeURIComponent(code)}`);
  }
  setScopeSetting(setting: Omit<ScopeSetting, 'updated_at'>) {
    return this.http.put<ScopeSetting>(`${this.base}/scope-settings`, setting);
  }

  // Products
  products(filter: ProductFilter = {}) {
    return this.http.get<Product[]>(`${this.base}/products`, { params: params(filter) });
  }
  product(id: number) {
    return this.http.get<Product>(`${this.base}/products/${id}`);
  }
  createProduct(data: ProductInput, remark: string) {
    return this.http.post<Product>(`${this.base}/products`, { ...data, remark });
  }
  updateProduct(id: number, data: ProductInput, remark: string) {
    return this.http.put<Product>(`${this.base}/products/${id}`, { ...data, remark });
  }
  deleteProduct(id: number, remark: string) {
    return this.http.delete<void>(`${this.base}/products/${id}`, { params: { remark } });
  }
  productHistory(id: number) {
    return this.http.get<HistoryEntry[]>(`${this.base}/products/${id}/history`);
  }
  history(opts: { limit: number; offset?: number; search?: string; hideImports?: boolean; region?: string; bu?: string }) {
    return this.http.get<Page<HistoryEntry>>(`${this.base}/history`, { params: params({ ...opts, offset: opts.offset ?? 0 }) });
  }

  // TDS documents
  tds(id: number, lang = 'EN') {
    return this.http.get<TdsDocument>(`${this.base}/tds/${id}`, { params: { lang } });
  }
  tdsMany(ids: number[], lang = 'EN') {
    return this.http.get<TdsDocument[]>(`${this.base}/tds`, { params: { ids: ids.join(','), lang } });
  }
  /** Unsaved form values (may be incomplete); nothing is stored. */
  tdsPreview(draft: Partial<ProductInput> & { id?: number }, lang = 'EN') {
    return this.http.post<TdsDocument>(`${this.base}/tds/preview`, draft, { params: { lang } });
  }

  // Templates, phrases, field catalog
  templates() {
    return this.http.get<Template[]>(`${this.base}/templates`);
  }
  template(id: number) {
    return this.http.get<Template>(`${this.base}/templates/${id}`);
  }
  phrases() {
    return this.http.get<Phrase[]>(`${this.base}/phrases`);
  }
  createPhrase(p: Pick<Phrase, 'key' | 'bu_code' | 'title' | 'body'>) {
    return this.http.post<Phrase>(`${this.base}/phrases`, p);
  }
  updatePhrase(p: Pick<Phrase, 'key' | 'bu_code' | 'title' | 'body'>) {
    return this.http.put<Phrase>(`${this.base}/phrases/${encodeURIComponent(p.key)}`, p);
  }
  deletePhrase(key: string) {
    return this.http.delete<void>(`${this.base}/phrases/${encodeURIComponent(key)}`);
  }
  fields() {
    return this.http.get<FieldDef[]>(`${this.base}/fields`);
  }

  // Lookups
  lookups() {
    return this.http.get<Lookup[]>(`${this.base}/lookups`);
  }
  addLookup(category: string, value: string) {
    return this.http.post<Lookup>(`${this.base}/lookups`, { category, value });
  }
  deleteLookup(id: number) {
    return this.http.delete<void>(`${this.base}/lookups/${id}`);
  }

  // Languages + translations
  languages() {
    return this.http.get<Language[]>(`${this.base}/languages`);
  }
  addLanguage(code: string, name: string) {
    return this.http.post<Language>(`${this.base}/languages`, { code, name });
  }
  updateLanguage(code: string, data: Partial<Pick<Language, 'name' | 'active'>>) {
    return this.http.put<Language>(`${this.base}/languages/${encodeURIComponent(code)}`, data);
  }
  deleteLanguage(code: string) {
    return this.http.delete<void>(`${this.base}/languages/${encodeURIComponent(code)}`);
  }
  translationSummary() {
    return this.http.get<TranslationSummary[]>(`${this.base}/translations/summary`);
  }
  translations(lang: string) {
    return this.http.get<TranslationItem[]>(`${this.base}/translations`, { params: { lang } });
  }
  saveTranslation(item: Pick<TranslationItem, 'scope' | 'ref' | 'text'> & { lang: string; status: 'suggested' | 'approved' }) {
    return this.http.put<TranslationItem>(`${this.base}/translations`, item);
  }
  approveAllTranslations(lang: string) {
    return this.http.post<{ approved: number }>(`${this.base}/translations/approve-all`, { lang });
  }
  /** AI suggestions need a server with an API key, so the demo reports them as off. */
  aiStatus() {
    return this.http.get<{ enabled: boolean; model: string | null }>(`${this.base}/translations/ai`);
  }
  suggestTranslations(lang: string, items: Pick<TranslationItem, 'scope' | 'ref'>[]) {
    return this.http.post<{ saved: TranslationItem[]; skipped: string[] }>(`${this.base}/translations/suggest`, { lang, items });
  }

  // Users + access (system admin)
  users() {
    return this.http.get<User[]>(`${this.base}/users`);
  }
  createUser(data: UserInput & { username: string }) {
    return this.http.post<UserWithPassword>(`${this.base}/users`, data);
  }
  updateUser(id: number, data: Partial<UserInput & { active: boolean; access: Access[] }>) {
    return this.http.put<User>(`${this.base}/users/${id}`, data);
  }
  resetPassword(id: number) {
    return this.http.post<UserWithPassword>(`${this.base}/users/${id}/reset-password`, {});
  }
  deleteUser(id: number) {
    return this.http.delete<void>(`${this.base}/users/${id}`);
  }
  audit(limit = 25, offset = 0) {
    return this.http.get<Page<AuditEntry>>(`${this.base}/audit`, { params: { limit, offset } });
  }
}

/** Query parameters without empty values. */
function params(values: { [key: string]: string | number | boolean | undefined | null } | ProductFilter) {
  let p = new HttpParams();
  for (const [k, v] of Object.entries(values)) if (v !== undefined && v !== null && v !== '' && v !== false) p = p.set(k, String(v));
  return p;
}
