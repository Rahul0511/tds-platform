import { Component, DestroyRef, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { forkJoin } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth/auth.service';
import { I18nService } from '../core/i18n/i18n.service';
import { translateTitle } from '../core/i18n/title-strategy';
import { TranslatePipe } from '../core/i18n/translate.pipe';
import { Language, Product, TdsDocument } from '../core/models';
import { ScopeService } from '../core/scope.service';
import { ToastService } from '../core/toast.service';
import { FitResult, TdsDocumentComponent } from '../shared/tds-document.component';
import { IconComponent } from '../shared/ui/icon.component';
import { PaginationComponent, Paginator } from '../shared/ui/pagination.component';

/**
 * Replaces TDS_Creator_EN_v6.xlsm: pick products, preview the TDS and export
 * it. Print and Save as PDF work on the ticked products, or on the previewed
 * TDS when nothing is ticked. There is no server, so PDFs are made by the
 * browser's print dialog ("Save as PDF"), one TDS per page set; with "All
 * languages" every product is printed in every active language.
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
  readonly scope = inject(ScopeService);

  /** ?id= from the URL, e.g. coming from the products table. */
  readonly id = input<string>();

  readonly products = signal<Product[]>([]);
  readonly loading = signal(true);
  readonly search = signal('');
  readonly type = signal('');
  readonly selected = signal<Set<number>>(new Set());
  readonly activeId = signal<number | null>(null);
  readonly preview = signal<TdsDocument | null>(null);
  readonly fit = signal<FitResult | null>(null);
  readonly zoom = signal(0.8);
  readonly busy = signal<'pdf' | 'print' | null>(null);

  /** TDS language for preview, print and download. */
  readonly languages = signal<Language[]>([]);
  readonly lang = signal(readLang());
  /** Save every active language at once. */
  readonly allLanguages = signal(false);
  readonly activeLanguages = computed(() => this.languages().filter((l) => l.active));
  readonly downloadLangs = computed(() => (this.allLanguages() ? this.activeLanguages().map((l) => l.code) : [this.lang()]));
  readonly downloadCount = computed(() => this.targetIds().length * this.downloadLangs().length);

  /** Documents rendered off-screen for the browser print dialog. */
  readonly printDocs = signal<TdsDocument[]>([]);
  private fittedForPrint = new Set<number>();

  readonly types = computed(() => [...new Set(this.products().map((p) => p.product_type ?? ''))].filter(Boolean).sort());
  readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const t = this.type();
    return this.products().filter(
      (p) => (!t || p.product_type === t) && (!q || (p.sales_code ?? '').includes(q) || p.name.toLowerCase().includes(q)),
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
    // The list follows the region and business unit chosen in the top bar.
    effect(() => {
      const filter = this.scope.filter();
      untracked(() => this.load(filter));
    });

    const afterPrint = () => {
      document.title = translateTitle(this.i18n, 'TDS Creator · TDS');
      this.printDocs.set([]);
      this.busy.set(null);
    };
    window.addEventListener('afterprint', afterPrint);
    inject(DestroyRef).onDestroy(() => window.removeEventListener('afterprint', afterPrint));
  }

  private load(filter: { region: string; bu: string }) {
    this.loading.set(true);
    this.api.products(filter).subscribe({
      next: (list) => {
        this.products.set(list);
        this.loading.set(false);
        this.selected.update((s) => new Set([...s].filter((id) => list.some((p) => p.id === id))));
        const wanted = Number(this.id()) || this.activeId();
        const first = list.find((p) => p.id === wanted) ?? list[0];
        // Keep the preview when the shown product is still in the list (no rebuild, no flicker).
        if (first && (first.id !== this.activeId() || !this.preview())) this.open(first.id);
        else {
          this.activeId.set(null);
          this.preview.set(null);
        }
      },
      error: (e) => {
        this.loading.set(false);
        this.toast.error(e, 'Could not load products');
      },
    });
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

  /** Save as PDF: the print dialog with the targets in the chosen language, or in every active language. */
  download() {
    this.printAll(this.downloadLangs(), 'pdf');
  }

  /** Browser print of the targets in the previewed language. */
  print() {
    this.printAll([this.lang()], 'print');
  }

  /**
   * One print job, each TDS on its own pages. The documents are rendered
   * off-screen first so each can measure itself and fit to its pages; the
   * dialog opens once all of them are ready.
   */
  private printAll(langs: string[], kind: 'pdf' | 'print') {
    const ids = this.targetIds();
    if (!ids.length || !langs.length) return;
    this.busy.set(kind);
    forkJoin(langs.map((l) => this.api.tdsMany(ids, l))).subscribe({
      next: (lists) => {
        const docs = lists.flat();
        this.fittedForPrint.clear();
        document.title = docs.length === 1 ? docs[0].meta.fileName : `TDS_${docs.length}_${new Date().toISOString().slice(0, 10)}`;
        this.printDocs.set(docs);
      },
      error: (e) => this.fail(e, 'Could not build the TDS'),
    });
  }

  onPrintDocFitted(index: number) {
    if (!this.busy()) return;
    this.fittedForPrint.add(index);
    if (this.fittedForPrint.size < this.printDocs().length) return;
    this.busy.set(null);
    // Let the fit styles apply and fonts load before the dialog opens.
    void document.fonts.ready.then(() => requestAnimationFrame(() => window.print()));
  }

  private fail(e: unknown, message: string) {
    this.busy.set(null);
    this.printDocs.set([]);
    this.toast.error(e, message);
  }
}
