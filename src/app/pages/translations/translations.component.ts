import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth/auth.service';
import { DialogService } from '../../core/dialog.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { Language, TranslationItem, TranslationStatus, TranslationSummary } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { IconComponent } from '../../shared/ui/icon.component';
import { PaginationComponent, Paginator } from '../../shared/ui/pagination.component';
import { TimeAgoPipe } from '../../shared/ui/time-ago.pipe';

type Filter = 'all' | 'open' | TranslationStatus;
type Tab = 'translate' | 'languages';

const AI_BATCH = 20;

export const STATUS_INFO: Record<TranslationStatus, { label: string; badge: string }> = {
  missing: { label: 'Not translated', badge: 'badge-neutral' },
  outdated: { label: 'Outdated', badge: 'badge-amber' },
  suggested: { label: 'To review', badge: 'badge-blue' },
  approved: { label: 'Approved', badge: 'badge-green' },
};

const keyOf = (i: Pick<TranslationItem, 'scope' | 'ref'>) => `${i.scope}|${i.ref}`;

/**
 * Translation workbench: English source next to the target language.
 * Machine or starter translations arrive as "To review"; a person approves
 * them. A change of the English text marks its translations "Outdated".
 */
@Component({
  selector: 'app-translations',
  imports: [FormsModule, IconComponent, PaginationComponent, TimeAgoPipe, TranslatePipe],
  templateUrl: './translations.component.html',
})
export class TranslationsComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private dialog = inject(DialogService);
  private router = inject(Router);
  readonly i18n = inject(I18nService);
  readonly auth = inject(AuthService);

  /** ?lang=DE from the URL. */
  readonly langParam = input<string>(undefined, { alias: 'lang' });

  readonly status = STATUS_INFO;
  readonly tab = signal<Tab>('translate');
  readonly languages = signal<Language[]>([]);
  readonly summary = signal<TranslationSummary[]>([]);
  readonly lang = signal<string | null>(null);
  readonly items = signal<TranslationItem[]>([]);
  readonly loading = signal(false);
  readonly drafts = signal<Record<string, string>>({});
  readonly saving = signal<Set<string>>(new Set());
  readonly ai = signal<{ enabled: boolean; model: string | null }>({ enabled: false, model: null });
  readonly aiProgress = signal<{ done: number; total: number } | null>(null);

  readonly search = signal('');
  readonly filter = signal<Filter>('open');
  readonly group = signal('');

  readonly targetLanguages = computed(() => this.languages().filter((l) => !l.base));
  readonly current = computed(() => this.summary().find((s) => s.code === this.lang()) ?? null);
  readonly groups = computed(() => [...new Set(this.items().map((i) => i.group))]);
  readonly counts = computed(() => {
    const c: Record<Filter, number> = { all: 0, open: 0, missing: 0, outdated: 0, suggested: 0, approved: 0 };
    for (const i of this.items()) {
      c.all++;
      c[i.status]++;
      if (i.status !== 'approved') c.open++;
    }
    return c;
  });
  readonly visible = computed(() => {
    const q = this.search().trim().toLowerCase();
    const f = this.filter();
    const g = this.group();
    return this.items().filter(
      (i) =>
        (f === 'all' || (f === 'open' ? i.status !== 'approved' : i.status === f)) &&
        (!g || i.group === g) &&
        (!q || [i.source, i.text, i.label].some((v) => v.toLowerCase().includes(q))),
    );
  });
  readonly pager = new Paginator(this.visible, 25);
  /** Items of the current page, grouped under their section heading. */
  readonly sections = computed(() => {
    const out: { group: string; items: TranslationItem[] }[] = [];
    for (const item of this.pager.items()) {
      const last = out[out.length - 1];
      if (last?.group === item.group) last.items.push(item);
      else out.push({ group: item.group, items: [item] });
    }
    return out;
  });
  readonly untranslated = computed(() => this.items().filter((i) => i.status === 'missing' || i.status === 'outdated'));

  readonly filters: { id: Filter; label: string }[] = [
    { id: 'open', label: 'Open' },
    { id: 'missing', label: 'Not translated' },
    { id: 'outdated', label: 'Outdated' },
    { id: 'suggested', label: 'To review' },
    { id: 'approved', label: 'Approved' },
    { id: 'all', label: 'All' },
  ];

  ngOnInit() {
    this.api.aiStatus().subscribe({ next: (s) => this.ai.set(s), error: () => {} });
    this.loadLanguages(this.langParam()?.toUpperCase());
  }

  // ---- Loading ----

  private loadLanguages(prefer?: string) {
    this.api.languages().subscribe({
      next: (langs) => {
        this.languages.set(langs);
        const targets = langs.filter((l) => !l.base);
        const pick = targets.find((l) => l.code === prefer) ?? targets.find((l) => l.code === this.lang()) ?? targets[0];
        this.refreshSummary();
        if (pick) this.selectLanguage(pick.code);
        else this.items.set([]);
      },
      error: (e) => this.toast.error(e, 'Could not load the languages'),
    });
  }

  refreshSummary() {
    this.api.translationSummary().subscribe({ next: (s) => this.summary.set(s), error: () => {} });
  }

  selectLanguage(code: string) {
    this.lang.set(code);
    this.pager.reset();
    this.drafts.set({});
    this.loading.set(true);
    void this.router.navigate([], { queryParams: { lang: code }, replaceUrl: true });
    this.api.translations(code).subscribe({
      next: (items) => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: (e) => {
        this.loading.set(false);
        this.toast.error(e, 'Could not load the translations');
      },
    });
  }

  // ---- Editing ----

  key(i: TranslationItem) {
    return keyOf(i);
  }

  value(i: TranslationItem) {
    return this.drafts()[keyOf(i)] ?? i.text;
  }

  isDirty(i: TranslationItem) {
    const d = this.drafts()[keyOf(i)];
    return d !== undefined && d !== i.text;
  }

  setDraft(i: TranslationItem, text: string) {
    this.drafts.update((d) => ({ ...d, [keyOf(i)]: text }));
  }

  /** Copy the English text as a starting point. */
  copySource(i: TranslationItem) {
    this.setDraft(i, i.source);
  }

  /** Saving a human edit, or approving a suggestion, marks it approved. */
  save(i: TranslationItem) {
    const lang = this.lang();
    if (!lang) return;
    const k = keyOf(i);
    this.saving.update((s) => new Set(s).add(k));
    this.api.saveTranslation({ scope: i.scope, ref: i.ref, lang, text: this.value(i), status: 'approved' }).subscribe({
      next: (saved) => {
        this.replace(saved);
        this.drafts.update((d) => {
          const { [k]: _, ...rest } = d;
          return rest;
        });
        this.doneSaving(k);
        this.refreshSummary();
      },
      error: (e: HttpErrorResponse) => {
        this.doneSaving(k);
        this.toast.error(e, 'Could not save the translation');
      },
    });
  }

  discard(i: TranslationItem) {
    const k = keyOf(i);
    this.drafts.update((d) => {
      const { [k]: _, ...rest } = d;
      return rest;
    });
  }

  async approveAll() {
    const lang = this.lang();
    const n = this.counts().suggested;
    if (!lang || !n) return;
    const ok = await this.dialog.confirm({
      title: this.i18n.t('Approve {n} translations?', { n }),
      message: 'Only do this after the texts have been reviewed. Compliance and legal texts should be checked by the responsible department.',
      confirmText: this.i18n.t('Approve {n}', { n }),
    });
    if (!ok) return;
    this.api.approveAllTranslations(lang).subscribe({
      next: (r) => {
        this.toast.success(this.i18n.t('Approved {n} translations', { n: r.approved }));
        this.selectLanguage(lang);
        this.refreshSummary();
      },
      error: (e) => this.toast.error(e, 'Could not approve'),
    });
  }

  // ---- AI suggestions ----

  suggestOne(i: TranslationItem) {
    const lang = this.lang();
    if (!lang) return;
    const k = keyOf(i);
    this.saving.update((s) => new Set(s).add(k));
    this.api.suggestTranslations(lang, [{ scope: i.scope, ref: i.ref }]).subscribe({
      next: (r) => {
        r.saved.forEach((s) => this.replace(s));
        this.discard(i);
        this.doneSaving(k);
        if (r.skipped.length) this.toast.error(null, 'The suggestion was not usable. Please translate this text by hand.');
        this.refreshSummary();
      },
      error: (e) => {
        this.doneSaving(k);
        this.toast.error(e, 'Could not get a suggestion');
      },
    });
  }

  async suggestAllMissing() {
    const lang = this.lang();
    const todo = this.untranslated();
    if (!lang || !todo.length) return;
    const ok = await this.dialog.confirm({
      title: this.i18n.t('Suggest {n} translations with AI?', { n: todo.length }),
      message: this.i18n.t(
        'Texts that are not translated or outdated are sent to Claude ({model}). The results are saved as "To review" and must be checked before approving.',
        { model: this.ai().model },
      ),
      confirmText: 'Suggest translations',
    });
    if (!ok) return;
    this.aiProgress.set({ done: 0, total: todo.length });
    let skipped = 0;
    try {
      for (let start = 0; start < todo.length; start += AI_BATCH) {
        const batch = todo.slice(start, start + AI_BATCH).map(({ scope, ref }) => ({ scope, ref }));
        const r = await firstValueFrom(this.api.suggestTranslations(lang, batch));
        r.saved.forEach((s) => this.replace(s));
        skipped += r.skipped.length;
        this.aiProgress.set({ done: Math.min(start + AI_BATCH, todo.length), total: todo.length });
      }
      this.toast.success(this.i18n.t('Suggested {n} translations. Please review them.', { n: todo.length - skipped }));
      if (skipped) this.toast.error(null, this.i18n.t('{n} texts could not be translated automatically.', { n: skipped }));
    } catch (e) {
      this.toast.error(e, 'AI suggestions stopped');
    } finally {
      this.aiProgress.set(null);
      this.refreshSummary();
    }
  }

  // ---- Languages (admin) ----

  newCode = '';
  newName = '';

  addLanguage() {
    this.api.addLanguage(this.newCode, this.newName).subscribe({
      next: (l) => {
        this.toast.success(this.i18n.t('Added {name}', { name: l.name }));
        this.newCode = '';
        this.newName = '';
        this.loadLanguages(l.code);
      },
      error: (e) => this.toast.error(e, 'Could not add the language'),
    });
  }

  toggleLanguage(l: Language) {
    this.api.updateLanguage(l.code, { active: !l.active }).subscribe({
      next: () => this.loadLanguages(this.lang() ?? undefined),
      error: (e) => this.toast.error(e, 'Could not change the language'),
    });
  }

  async deleteLanguage(l: Language) {
    const ok = await this.dialog.confirm({
      title: this.i18n.t('Delete {name}?', { name: l.name }),
      message: this.i18n.t('All {name} translations are deleted. This cannot be undone. Switching the language off keeps them instead.', { name: l.name }),
      confirmText: 'Delete language',
      tone: 'danger',
    });
    if (!ok) return;
    this.api.deleteLanguage(l.code).subscribe({
      next: () => {
        this.toast.success(this.i18n.t('Deleted {name}', { name: l.name }));
        this.loadLanguages();
      },
      error: (e) => this.toast.error(e, 'Could not delete the language'),
    });
  }

  summaryOf(code: string) {
    return this.summary().find((s) => s.code === code);
  }

  pct(n: number, total: number) {
    return total ? (n / total) * 100 : 0;
  }

  private replace(item: TranslationItem) {
    this.items.update((list) => list.map((x) => (keyOf(x) === keyOf(item) ? item : x)));
  }

  private doneSaving(k: string) {
    this.saving.update((s) => {
      const next = new Set(s);
      next.delete(k);
      return next;
    });
  }
}
