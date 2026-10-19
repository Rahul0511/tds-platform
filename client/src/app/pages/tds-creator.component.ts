import { Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth/auth.service';
import { I18nService } from '../core/i18n/i18n.service';
import { translateTitle } from '../core/i18n/title-strategy';
import { TranslatePipe } from '../core/i18n/translate.pipe';
import { Language, Product, TdsDocument } from '../core/models';
import { ToastService } from '../core/toast.service';
import { FitResult, TdsDocumentComponent } from '../shared/tds-document.component';
import { IconComponent } from '../shared/ui/icon.component';
import { PaginationComponent, Paginator } from '../shared/ui/pagination.component';

/**
 * Replaces TDS_Creator_EN_v6.xlsm: pick products, preview the TDS and export
 * it. Download and Print work on the ticked products, or on the previewed
 * TDS when nothing is ticked. Downloads are made on the server, one PDF per
 * product and language; several come as a ZIP of separate PDFs.
 */

const LANG_KEY = 'tds.creatorLang';
const readLang = () => {
  try {
    return localStorage.getItem(LANG_KEY) || 'EN';
  } catch {
    return 'EN';
  }
};
@Component({
  selector: 'app-tds-creator',
  imports: [FormsModule, RouterLink, TdsDocumentComponent, IconComponent, PaginationComponent, TranslatePipe],
  templateUrl: './tds-creator.component.html',
})
export class TdsCreatorComponent {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private i18n = inject(I18nService);
  readonly auth = inject(AuthService);

  /** ?id= from the URL, e.g. coming from the products table. */
  readonly id = input<string>();

  readonly products = signal<Product[]>([]);
  readonly loading = signal(true);
  readonly search = signal('');
  readonly header = signal('');
  readonly selected = signal<Set<number>>(new Set());
  readonly activeId = signal<number | null>(null);
  readonly preview = signal<TdsDocument | null>(null);
  readonly fit = signal<FitResult | null>(null);
  readonly zoom = signal(0.8);
  readonly busy = signal<'download' | 'print' | null>(null);

  /** TDS language for preview, print and download. */
  readonly languages = signal<Language[]>([]);
  readonly lang = signal(readLang());
  /** Download every active language at once (as a ZIP). */
  readonly allLanguages = signal(false);
  readonly activeLanguages = computed(() => this.languages().filter((l) => l.active));
  readonly downloadLangs = computed(() => (this.allLanguages() ? this.activeLanguages().map((l) => l.code) : [this.lang()]));
  readonly downloadCount = computed(() => this.targetIds().length * this.downloadLangs().length);

  /** Documents rendered off-screen for the browser print dialog. */
  readonly printDocs = signal<TdsDocument[]>([]);
  private fittedForPrint = new Set<string>();

  readonly headers = computed(() => [...new Set(this.products().map((p) => p.header))].sort());
  readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const h = this.header();
    return this.products().filter(
      (p) => (!h || p.header === h) && (!q || p.sales_code.includes(q) || p.designation.toLowerCase().includes(q)),
    );
  });
  readonly pager = new Paginator(this.filtered, 25);
  readonly allFilteredSelected = computed(() => this.filtered().length > 0 && this.filtered().every((p) => this.selected().has(p.id)));

  /** What Download / Print act on: the ticked products, else the previewed one. */
  readonly targetIds = computed(() => {
    const ticked = this.products().filter((p) => this.selected().has(p.id)).map((p) => p.id);
    if (ticked.length) return ticked;
    const active = this.activeId();
    return active ? [active] : [];
  });
  constructor() {
    this.api.languages().subscribe({
      next: (list) => {
        this.languages.set(list);
        // A remembered language that was removed or switched off falls back to English.
        if (!list.some((l) => l.code === this.lang() && l.active)) this.lang.set('EN');
      },
      error: () => {},
    });
    this.api.products().subscribe({
      next: (list) => {
        this.products.set(list);
        this.loading.set(false);
        const wanted = Number(this.id());
        const first = list.find((p) => p.id === wanted) ?? list[0];
        if (first) this.open(first.id);
      },
      error: (e) => {
        this.loading.set(false);
        this.toast.error(e, 'Could not load products');
      },
    });

    const afterPrint = () => {
      document.title = translateTitle(this.i18n, 'TDS Creator · TDS');
      this.printDocs.set([]);
      this.busy.set(null);
    };
    window.addEventListener('afterprint', afterPrint);
    inject(DestroyRef).onDestroy(() => window.removeEventListener('afterprint', afterPrint));
  }

  setLang(code: string) {
    this.lang.set(code);
    try {
      localStorage.setItem(LANG_KEY, code);
    } catch {
      /* not remembered */
    }
    const id = this.activeId();
    if (id) this.open(id);
  }

  open(id: number) {
    this.activeId.set(id);
    this.fit.set(null);
    this.api.tds(id, this.lang()).subscribe({
      next: (doc) => this.preview.set(doc),
      error: (e) => this.toast.error(e, 'Could not build the TDS'),
    });
  }

  toggle(id: number) {
    this.selected.update((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  toggleAll() {
    const ids = this.filtered().map((p) => p.id);
    this.selected.update((s) => {
      const next = new Set(s);
      if (this.allFilteredSelected()) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }

  clearSelection() {
    this.selected.set(new Set());
  }

  /** One product in one language: one PDF. Otherwise a ZIP with one PDF per product and language. */
  download() {
    const ids = this.targetIds();
    const langs = this.downloadLangs();
    if (!ids.length || !langs.length) return;
    const n = ids.length * langs.length;
    this.busy.set('download');
    const req = n === 1 ? this.api.tdsPdf(ids[0], langs[0]) : this.api.tdsZip(ids, langs);
    req.subscribe({
      next: ({ blob, fileName }) => {
        this.busy.set(null);
        this.save(blob, fileName);
        if (n > 1) this.toast.success(this.i18n.t('Downloaded {n} PDFs ({langs}) in one ZIP', { n, langs: langs.join(', ') }));
      },
      error: (e) => this.fail(e, n === 1 ? 'Could not create the PDF' : 'Could not export the PDFs'),
    });
  }

  /**
   * Browser print of the targets in one print job, each TDS on its own page.
   * The documents are rendered off-screen first so each can measure itself
   * and fit to one page; the dialog opens once all of them are ready.
   */
  print() {
    const ids = this.targetIds();
    if (!ids.length) return;
    this.busy.set('print');
    this.api.tdsMany(ids, this.lang()).subscribe({
      next: (docs) => {
        this.fittedForPrint.clear();
        document.title = docs.length === 1 ? docs[0].meta.fileName : `TDS_${docs.length}_${new Date().toISOString().slice(0, 10)}`;
        this.printDocs.set(docs);
      },
      error: (e) => this.fail(e, 'Could not build the TDS'),
    });
  }

  onPrintDocFitted(doc: TdsDocument) {
    if (this.busy() !== 'print') return;
    this.fittedForPrint.add(doc.salesCode);
    if (this.fittedForPrint.size < this.printDocs().length) return;
    this.busy.set(null);
    // Let the fit styles apply and fonts load before the dialog opens.
    void document.fonts.ready.then(() => requestAnimationFrame(() => window.print()));
  }

  private save(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: fileName });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  private fail(e: unknown, message: string) {
    this.busy.set(null);
    this.printDocs.set([]);
    // Blob error bodies are not parsed as JSON, so show the generic message.
    this.toast.error(null, message);
    console.error(e);
  }
}
