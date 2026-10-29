import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth/auth.service';
import { ALL } from '../../core/auth/roles';
import { DialogService } from '../../core/dialog.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { FieldDef, Phrase, Template } from '../../core/models';
import { ScopeService } from '../../core/scope.service';
import { ToastService } from '../../core/toast.service';
import { IconComponent } from '../../shared/ui/icon.component';
import { PaginationComponent, Paginator } from '../../shared/ui/pagination.component';
import { TimeAgoPipe } from '../../shared/ui/time-ago.pipe';

type Tab = 'templates' | 'phrases' | 'fields';

const TYPE_LABELS: Record<string, string> = {
  text: 'Text',
  textarea: 'Text (lines)',
  richtext: 'Rich text',
  number: 'Number',
  integer: 'Whole number',
  select: 'Drop-down',
  boolean: 'Yes / no',
  rating: 'Rating 1–10',
  table: 'Table',
};

/**
 * Templates of each business unit, the phrase library and the field
 * catalog: the bricks every TDS is generated from.
 */
@Component({
  selector: 'app-templates',
  imports: [FormsModule, IconComponent, PaginationComponent, TimeAgoPipe, TranslatePipe],
  template: `
    <div class="page">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="page-title">{{ 'Templates' | t }}</h1>
          <p class="page-subtitle">{{ 'Each business unit has its own TDS templates, built from standard fields and phrases.' | t }}</p>
        </div>
        @if (tab() === 'phrases' && auth.isBuAdmin()) {
          <button type="button" class="btn-primary" (click)="newPhrase()"><app-icon name="plus" [size]="16" /> {{ 'New phrase' | t }}</button>
        }
      </div>

      <div class="mt-6 flex gap-1 border-b border-line" role="tablist">
        @for (t of tabs; track t.id) {
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="tab() === t.id"
            class="-mb-px border-b-2 px-3 pb-3 pt-1 text-sm font-medium transition"
            [class]="tab() === t.id ? 'border-brand-600 text-ink' : 'border-transparent text-muted hover:text-ink'"
            (click)="tab.set(t.id)"
          >
            {{ t.label | t }}
          </button>
        }
      </div>

      <!-- ===== Templates by business unit ===== -->
      @if (tab() === 'templates') {
        @for (g of byBu(); track g.bu) {
          <h2 class="mb-3 mt-8 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
            <span class="badge-neutral">{{ g.bu }}</span> {{ scope.buName(g.bu) }}
          </h2>
          <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            @for (t of g.templates; track t.id) {
              <article class="card flex flex-col p-5" [class.opacity-60]="!t.active">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <h3 class="truncate font-semibold text-ink">{{ t.name }}</h3>
                    <p class="mt-0.5 font-mono text-xs text-muted">{{ t.code }} · v{{ t.version }}</p>
                  </div>
                  <span class="flex shrink-0 flex-col items-end gap-1">
                    <span class="badge-neutral">{{ t.region_code ?? ('All regions' | t) }}</span>
                    @if (!t.active) {
                      <span class="badge-amber">{{ 'Off' | t }}</span>
                    }
                  </span>
                </div>
                @if (t.description) {
                  <p class="mt-3 line-clamp-3 text-sm text-ink-2">{{ t.description }}</p>
                }
                <dl class="mt-4 grid grid-cols-3 gap-2 text-xs">
                  <div><dt class="text-muted">{{ 'Sections' | t }}</dt><dd class="font-semibold tabular-nums text-ink">{{ t.definition.sections.length }}</dd></div>
                  <div><dt class="text-muted">{{ 'Fields' | t }}</dt><dd class="font-semibold tabular-nums text-ink">{{ fieldCount(t) }}</dd></div>
                  <div><dt class="text-muted">{{ 'Products' | t }}</dt><dd class="font-semibold tabular-nums text-ink">{{ t.used_by }}</dd></div>
                </dl>
                <div class="mt-auto flex items-center gap-1 pt-4">
                  <span class="mr-auto text-xs text-subtle">{{ t.updated_at | timeAgo }}{{ t.updated_by ? ' · ' + t.updated_by : '' }}</span>
                </div>
              </article>
            }
          </div>
        } @empty {
          <p class="mt-8 text-sm text-muted">{{ (loading() ? 'Loading…' : 'No templates yet.') | t }}</p>
        }
        <p class="mt-8 flex items-start gap-2 rounded-lg border border-line bg-surface-2/60 px-4 py-3 text-sm text-ink-2">
          <app-icon name="info" [size]="16" class="mt-0.5 text-subtle" />
          <span>{{ 'Templates are maintained in the code (src/app/templates), not in the app. To add or change one, ask the development team.' | t }}</span>
        </p>
      }

      <!-- ===== Phrase library ===== -->
      @if (tab() === 'phrases') {
        <div class="mt-6 grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div class="card h-fit overflow-hidden">
            <div class="space-y-2 border-b border-line p-3">
              <input class="input" type="search" [placeholder]="'Search phrases' | t" [attr.aria-label]="'Search phrases' | t" [ngModel]="phraseSearch()" (ngModelChange)="phraseSearch.set($event)" />
              <select class="input" [attr.aria-label]="'Filter by business unit' | t" [ngModel]="phraseBu()" (ngModelChange)="phraseBu.set($event)">
                <option value="">{{ 'All business units' | t }}</option>
                <option value="-">{{ 'Shared' | t }}</option>
                @for (b of scope.businessUnits(); track b.code) {
                  <option [value]="b.code">{{ b.name }}</option>
                }
              </select>
            </div>
            <nav class="max-h-[65vh] overflow-y-auto p-2" [attr.aria-label]="'Phrases' | t">
              @for (p of visiblePhrases(); track p.key) {
                <button
                  type="button"
                  class="block w-full rounded-lg px-3 py-2 text-left text-sm transition"
                  [class]="draft()?.key === p.key && !draftIsNew() ? 'bg-brand-500/10 text-brand-700 dark:text-brand-300' : 'text-ink-2 hover:bg-surface-2'"
                  (click)="editPhrase(p)"
                >
                  <span class="block truncate font-medium">{{ p.title }}</span>
                  <span class="flex items-center gap-1.5 text-[11px] text-muted">
                    <span class="font-mono">{{ p.key }}</span>
                    <span class="badge-neutral !px-1 !py-0 text-[10px]">{{ p.bu_code ?? ('shared' | t) }}</span>
                  </span>
                </button>
              } @empty {
                <p class="p-4 text-center text-sm text-muted">{{ 'No phrases match.' | t }}</p>
              }
            </nav>
          </div>

          @if (draft(); as d) {
            <section class="card">
              <div class="card-header">
                <h2 class="card-title">{{ draftIsNew() ? ('New phrase' | t) : d.title }}</h2>
                @if (!draftIsNew() && d.updated_by) {
                  <span class="text-xs text-muted">{{ 'Changed {when} by {name}' | t: { when: (d.updated_at | timeAgo), name: d.updated_by } }}</span>
                }
              </div>
              <div class="space-y-4 p-5">
                <div class="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label class="label" for="ph-key">{{ 'Key' | t }}</label>
                    <input id="ph-key" class="input font-mono" [disabled]="!draftIsNew()" [(ngModel)]="d.key" placeholder="nw.my_text" />
                  </div>
                  <div class="sm:col-span-2">
                    <label class="label" for="ph-title">{{ 'Title' | t }}</label>
                    <input id="ph-title" class="input" [disabled]="!mayEditPhrase(d)" [(ngModel)]="d.title" />
                  </div>
                </div>
                <div>
                  <label class="label" for="ph-bu">{{ 'Business unit' | t }}</label>
                  <select id="ph-bu" class="input max-w-xs" [disabled]="!mayEditPhrase(d)" [(ngModel)]="d.bu_code">
                    <option [ngValue]="null">{{ 'Shared by every business unit' | t }}</option>
                    @for (b of scope.businessUnits(); track b.code) {
                      <option [ngValue]="b.code">{{ b.name }}</option>
                    }
                  </select>
                </div>
                <div>
                  <label class="label" for="ph-body">{{ 'Text' | t }}</label>
                  <textarea id="ph-body" rows="12" class="input font-mono text-[13px]" [disabled]="!mayEditPhrase(d)" [(ngModel)]="d.body"></textarea>
                  <p class="hint">
                    @let marks = i18n.parts('Formatting: {marks}');
                    {{ marks[0] }}<span class="kbd">- </span> {{ 'bullet' | t }} · <span class="kbd">## </span> {{ 'heading' | t }} · <span class="kbd">**…**</span> {{ 'bold' | t }} ·
                    <span class="kbd">{{ placeholderExample }}</span> {{ 'product value' | t }}{{ marks[1] }}
                  </p>
                </div>
                @if (d.used_in.length) {
                  <p class="flex flex-wrap items-center gap-1.5 text-xs text-muted">
                    {{ 'Used in' | t }}
                    @for (code of d.used_in; track code) {
                      <span class="badge-neutral font-mono">{{ code }}</span>
                    }
                    · {{ 'A change shows on every TDS of these templates.' | t }}
                  </p>
                }
              </div>
              @if (mayEditPhrase(d)) {
                <div class="flex justify-between border-t border-line px-5 py-3">
                  @if (!draftIsNew()) {
                    <button type="button" class="btn-ghost text-red-600 hover:!bg-red-500/10 dark:text-red-400" [disabled]="d.used_in.length > 0" (click)="deletePhrase(d)">
                      <app-icon name="trash" [size]="16" /> {{ 'Delete' | t }}
                    </button>
                  } @else {
                    <span></span>
                  }
                  <button type="button" class="btn-primary" (click)="savePhrase(d)"><app-icon name="check" [size]="16" /> {{ 'Save' | t }}</button>
                </div>
              } @else {
                <p class="border-t border-line px-5 py-3 text-xs text-muted">
                  {{ (d.bu_code ? 'Only a BU admin of this business unit (all regions) can change this phrase.' : 'Shared phrases are changed by a system admin.') | t }}
                </p>
              }
            </section>
          } @else {
            <div class="card grid place-items-center p-10 text-sm text-muted">{{ 'Pick a phrase to read or edit it.' | t }}</div>
          }
        </div>
      }

      <!-- ===== Field catalog ===== -->
      @if (tab() === 'fields') {
        <p class="mt-6 max-w-3xl text-sm text-muted">
          {{ 'Standard fields mean the same in every business unit and are entered the same way. The other fields belong to the templates of one business unit.' | t }}
        </p>
        <div class="card mt-4 overflow-x-auto">
          <table class="table">
            <thead>
              <tr>
                <th>{{ 'Field' | t }}</th>
                <th>{{ 'Key' | t }}</th>
                <th>{{ 'Type' | t }}</th>
                <th>{{ 'Kind' | t }}</th>
                <th>{{ 'Used by' | t }}</th>
              </tr>
            </thead>
            <tbody>
              @for (f of fieldsPager.items(); track f.key) {
                <tr>
                  <td class="font-medium text-ink">
                    {{ f.label | t }}
                    @if (f.required) {
                      <span class="text-red-500">*</span>
                    }
                  </td>
                  <td class="font-mono text-xs text-muted">{{ f.key }}</td>
                  <td class="whitespace-nowrap text-ink-2">
                    {{ typeLabel(f.type) | t }}
                    @if (f.lookup) {
                      <span class="text-subtle">· {{ f.lookup }}</span>
                    }
                  </td>
                  <td>
                    @if (f.standard) {
                      <span class="badge-brand">{{ 'Standard' | t }}</span>
                    } @else {
                      <span class="badge-neutral">{{ 'Business unit' | t }}</span>
                    }
                  </td>
                  <td>
                    <div class="flex flex-wrap gap-1">
                      @for (b of f.bus ?? []; track b) {
                        <span class="badge-neutral" [title]="scope.buName(b)">{{ b }}</span>
                      } @empty {
                        <span class="text-xs text-subtle">{{ 'not used' | t }}</span>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
          <app-pagination [total]="fieldsPager.total()" [(page)]="fieldsPager.page" [(pageSize)]="fieldsPager.pageSize" />
        </div>
      }
    </div>
  `,
})
export class TemplatesComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private dialog = inject(DialogService);
  private router = inject(Router);
  readonly i18n = inject(I18nService);
  readonly auth = inject(AuthService);
  readonly scope = inject(ScopeService);

  /** ?tab=phrases from the URL. */
  readonly tabParam = input<string>(undefined, { alias: 'tab' });

  readonly tabs: { id: Tab; label: string }[] = [
    { id: 'templates', label: 'Templates' },
    { id: 'phrases', label: 'Phrase library' },
    { id: 'fields', label: 'Field catalog' },
  ];
  readonly tab = signal<Tab>('templates');
  readonly loading = signal(true);
  readonly templates = signal<Template[]>([]);
  readonly phrases = signal<Phrase[]>([]);
  readonly fields = signal<FieldDef[]>([]);
  readonly fieldsPager = new Paginator(this.fields, 25);
  readonly placeholderExample = '{{shelf_life_months}}';

  readonly byBu = computed(() => {
    const bus = [...new Set(this.templates().map((t) => t.bu_code))];
    return bus.map((bu) => ({ bu, templates: this.templates().filter((t) => t.bu_code === bu) }));
  });

  // Phrases
  readonly phraseSearch = signal('');
  readonly phraseBu = signal('');
  readonly draft = signal<Phrase | null>(null);
  readonly draftIsNew = signal(false);
  readonly visiblePhrases = computed(() => {
    const q = this.phraseSearch().trim().toLowerCase();
    const bu = this.phraseBu();
    return this.phrases().filter(
      (p) => (!bu || (bu === '-' ? !p.bu_code : p.bu_code === bu)) && (!q || [p.key, p.title, p.body].some((v) => v.toLowerCase().includes(q))),
    );
  });

  ngOnInit() {
    this.scope.load();
    const t = this.tabParam();
    if (t === 'phrases' || t === 'fields') this.tab.set(t);
    this.load();
  }

  load() {
    forkJoin({ templates: this.api.templates(), phrases: this.api.phrases(), fields: this.api.fields() }).subscribe({
      next: ({ templates, phrases, fields }) => {
        this.templates.set(templates);
        this.phrases.set(phrases);
        this.fields.set(fields);
        this.loading.set(false);
      },
      error: (e) => {
        this.loading.set(false);
        this.toast.error(e, 'Could not load the templates');
      },
    });
  }

  fieldCount(t: Template) {
    return t.fields.reduce((n, g) => n + g.keys.length, 0);
  }

  typeLabel(type: string) {
    return TYPE_LABELS[type] ?? type;
  }

  // ---- Phrases ----

  mayEditPhrase(p: Phrase) {
    return this.auth.can('bu_admin', ALL, p.bu_code ?? ALL);
  }

  editPhrase(p: Phrase) {
    this.draftIsNew.set(false);
    this.draft.set({ ...p });
  }

  newPhrase() {
    const bu = this.scope.bu() || this.scope.businessUnits().find((b) => this.auth.can('bu_admin', ALL, b.code))?.code || null;
    this.draftIsNew.set(true);
    this.draft.set({ key: bu ? `${bu.toLowerCase()}.` : '', bu_code: bu, title: '', body: '', updated_at: null, updated_by: null, used_in: [] });
  }

  savePhrase(p: Phrase) {
    const req = this.draftIsNew() ? this.api.createPhrase(p) : this.api.updatePhrase(p);
    req.subscribe({
      next: (saved) => {
        this.phrases.update((list) => [...list.filter((x) => x.key !== saved.key), saved].sort((a, b) => a.key.localeCompare(b.key)));
        this.draftIsNew.set(false);
        this.draft.set({ ...saved });
        this.toast.success(this.i18n.t('Saved "{name}"', { name: saved.title }));
      },
      error: (e) => this.toast.error(e, 'Could not save'),
    });
  }

  async deletePhrase(p: Phrase) {
    const ok = await this.dialog.confirm({
      title: this.i18n.t('Delete {name}?', { name: p.title }),
      message: 'The phrase and its translations are deleted.',
      confirmText: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    this.api.deletePhrase(p.key).subscribe({
      next: () => {
        this.phrases.update((list) => list.filter((x) => x.key !== p.key));
        this.draft.set(null);
      },
      error: (e) => this.toast.error(e, 'Could not delete'),
    });
  }
}
