import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, shareReplay } from 'rxjs';
import {
  AuditEntry,
  HeaderRule,
  HistoryEntry,
  Language,
  Lookup,
  Page,
  Meta,
  Product,
  ProductInput,
  Settings,
  Stats,
  TdsDocument,
  TextBlock,
  TranslationItem,
  TranslationSummary,
  User,
  UserWithPassword,
} from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = '/api';

  readonly meta$: Observable<Meta> = this.http.get<Meta>(`${this.base}/meta`).pipe(shareReplay(1));

  stats() {
    return this.http.get<Stats>(`${this.base}/stats`);
  }

  // Products
  products(filter: { search?: string; header?: string } = {}) {
    let params = new HttpParams();
    if (filter.search) params = params.set('search', filter.search);
    if (filter.header) params = params.set('header', filter.header);
    return this.http.get<Product[]>(`${this.base}/products`, { params });
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
  history(opts: { limit: number; offset?: number; search?: string; hideImports?: boolean }) {
    const params: Record<string, string | number | boolean> = { limit: opts.limit, offset: opts.offset ?? 0 };
    if (opts.search) params['search'] = opts.search;
    if (opts.hideImports) params['hideImports'] = true;
    return this.http.get<Page<HistoryEntry>>(`${this.base}/history`, { params });
  }

  // TDS documents
  tds(id: number, lang = 'EN') {
    return this.http.get<TdsDocument>(`${this.base}/tds/${id}`, { params: { lang } });
  }
  tdsMany(ids: number[], lang = 'EN') {
    return this.http.get<TdsDocument[]>(`${this.base}/tds`, { params: { ids: ids.join(','), lang } });
  }
  /** Server-rendered PDF of one TDS. */
  tdsPdf(id: number, lang = 'EN') {
    return this.download(`${this.base}/tds/${id}/pdf`, { lang });
  }
  /** ZIP with one PDF per product and language. */
  tdsZip(ids: number[], langs: string[]) {
    return this.download(`${this.base}/tds/export.zip`, { ids: ids.join(','), langs: langs.join(',') });
  }
  /** Unsaved form values (may be incomplete); nothing is stored. */
  tdsPreview(draft: { [K in keyof ProductInput]?: unknown } & { id?: number }) {
    return this.http.post<TdsDocument>(`${this.base}/tds/preview`, draft);
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

  // Header rules
  headers() {
    return this.http.get<HeaderRule[]>(`${this.base}/headers`);
  }
  addHeader(rule: HeaderRule) {
    return this.http.post<HeaderRule>(`${this.base}/headers`, rule);
  }
  updateHeader(rule: HeaderRule) {
    return this.http.put<HeaderRule>(`${this.base}/headers/${encodeURIComponent(rule.code)}`, rule);
  }

  // Text blocks + settings
  textBlocks() {
    return this.http.get<TextBlock[]>(`${this.base}/text-blocks`);
  }
  updateTextBlock(block: Pick<TextBlock, 'key' | 'title' | 'body'>) {
    return this.http.put<TextBlock>(`${this.base}/text-blocks/${block.key}`, block);
  }
  settings() {
    return this.http.get<Settings>(`${this.base}/settings`);
  }
  updateSettings(settings: Settings) {
    return this.http.put<Settings>(`${this.base}/settings`, settings);
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
  aiStatus() {
    return this.http.get<{ enabled: boolean; model: string | null }>(`${this.base}/translations/ai`);
  }
  suggestTranslations(lang: string, items: Pick<TranslationItem, 'scope' | 'ref'>[]) {
    return this.http.post<{ saved: TranslationItem[]; skipped: string[] }>(`${this.base}/translations/suggest`, { lang, items });
  }

  // Users + roles (admin)
  users() {
    return this.http.get<User[]>(`${this.base}/users`);
  }
  createUser(data: Pick<User, 'username' | 'display_name' | 'email' | 'role'>) {
    return this.http.post<UserWithPassword>(`${this.base}/users`, data);
  }
  updateUser(id: number, data: Partial<Pick<User, 'display_name' | 'email' | 'role' | 'active'>>) {
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

  private download(url: string, params: Record<string, string> = {}) {
    return this.http.get(url, { params, responseType: 'blob', observe: 'response' }).pipe(
      map((res) => {
        const header = res.headers.get('Content-Disposition') ?? '';
        const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header)?.[1];
        const plain = /filename="([^"]+)"/i.exec(header)?.[1];
        return { blob: res.body as Blob, fileName: utf8 ? decodeURIComponent(utf8) : (plain ?? 'download') };
      }),
    );
  }
}
