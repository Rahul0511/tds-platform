import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth/auth.service';
import { I18nService } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/translate.pipe';
import { HistoryEntry, Stats } from '../core/models';
import { ToastService } from '../core/toast.service';
import { AvatarComponent } from '../shared/ui/avatar.component';
import { IconComponent, IconName } from '../shared/ui/icon.component';
import { TimeAgoPipe } from '../shared/ui/time-ago.pipe';

interface QuickAction {
  link: string;
  icon: IconName;
  title: string;
  text: string;
  editorOnly?: boolean;
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, AvatarComponent, IconComponent, TimeAgoPipe, TranslatePipe],
  template: `
    <div class="page">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="text-sm font-medium text-brand-600 dark:text-brand-400">{{ greeting() }}</p>
          <h1 class="page-title mt-1">{{ auth.user()?.display_name }}</h1>
          <p class="page-subtitle">{{ 'Technical data sheets for water-based sheet-fed OPVs, from one database.' | t }}</p>
        </div>
        <a routerLink="/creator" class="btn-primary"><app-icon name="file" [size]="16" /> {{ 'Open TDS Creator' | t }}</a>
      </div>

      <!-- KPIs -->
      @if (stats(); as s) {
        <div class="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div class="card p-5">
            <div class="flex items-center justify-between text-muted">
              <span class="text-sm">{{ 'Products / TDS' | t }}</span>
              <app-icon name="database" [size]="18" />
            </div>
            <div class="mt-3 text-3xl font-semibold tabular-nums text-ink">{{ s.products }}</div>
          </div>
          <div class="card p-5">
            <div class="flex items-center justify-between text-muted">
              <span class="text-sm">{{ 'Changes, last 30 days' | t }}</span>
              <app-icon name="activity" [size]="18" />
            </div>
            <div class="mt-3 text-3xl font-semibold tabular-nums text-ink">{{ s.changesLast30Days }}</div>
          </div>
          <div class="card p-5">
            <div class="flex items-center justify-between text-muted">
              <span class="text-sm">{{ 'Controlled values' | t }}</span>
              <app-icon name="list" [size]="18" />
            </div>
            <div class="mt-3 text-3xl font-semibold tabular-nums text-ink">{{ s.lookups }}</div>
          </div>
          <div class="card p-5">
            <div class="flex items-center justify-between text-muted">
              <span class="text-sm">{{ 'By header' | t }}</span>
              <app-icon name="layers" [size]="18" />
            </div>
            <div class="mt-3 space-y-2">
              @for (h of s.byHeader; track h.header) {
                <div class="flex items-center gap-3 text-sm">
                  <span class="w-10 font-medium text-ink-2">{{ h.header }}</span>
                  <span class="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <span class="block h-full rounded-full bg-brand-500" [style.width.%]="(h.n / s.products) * 100"></span>
                  </span>
                  <span class="w-6 text-right tabular-nums text-muted">{{ h.n }}</span>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <div class="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <!-- Quick actions -->
        <section>
          <h2 class="mb-3 text-sm font-semibold text-ink">{{ 'Quick actions' | t }}</h2>
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            @for (a of actions(); track a.link) {
              <a [routerLink]="a.link" class="card group flex gap-4 p-4 transition hover:-translate-y-0.5 hover:border-brand-500/40 hover:shadow-pop">
                <span class="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400">
                  <app-icon [name]="a.icon" [size]="20" />
                </span>
                <span class="min-w-0">
                  <span class="flex items-center gap-1 text-sm font-medium text-ink">
                    {{ a.title | t }}
                    <app-icon name="arrow-right" [size]="14" class="text-subtle transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
                  </span>
                  <span class="mt-0.5 block text-xs text-muted">{{ a.text | t }}</span>
                </span>
              </a>
            }
          </div>
        </section>

        <!-- Recent changes -->
        <section class="card">
          <div class="card-header">
            <h2 class="card-title">{{ 'Recent changes' | t }}</h2>
            <a routerLink="/history" class="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">{{ 'View all' | t }}</a>
          </div>
          <ul class="divide-y divide-line">
            @for (h of recent(); track h.id) {
              <li class="flex items-center gap-3 px-5 py-3">
                <app-avatar [name]="h.changed_by ?? '?'" [size]="30" />
                <div class="min-w-0 flex-1">
                  <div class="truncate text-sm text-ink-2">
                    <span class="font-medium text-ink">{{ h.changed_by ?? ('Someone' | t) }}</span>
                    {{ verbs[h.action] | t }}
                    <span class="font-mono text-xs">{{ h.sales_code }}</span>
                  </div>
                  @if (h.remark) {
                    <div class="truncate text-xs text-muted">{{ h.remark }}</div>
                  }
                </div>
                <span class="whitespace-nowrap text-xs text-subtle">{{ h.changed_at | timeAgo }}</span>
              </li>
            } @empty {
              <li class="px-5 py-10 text-center text-sm text-muted">{{ 'No changes yet.' | t }}</li>
            }
          </ul>
        </section>
      </div>
    </div>
  `,
})
export class DashboardComponent {
  private api = inject(ApiService);
  readonly auth = inject(AuthService);

  readonly stats = signal<Stats | null>(null);
  readonly recent = signal<HistoryEntry[]>([]);
  private i18n = inject(I18nService);
  // "Anna created 15-609656-2": the verb sits between name and code in every app language.
  readonly verbs: Record<HistoryEntry['action'], string> = {
    created: 'verb:created',
    updated: 'verb:updated',
    deleted: 'verb:deleted',
    imported: 'verb:imported',
  };

  private readonly allActions: QuickAction[] = [
    { link: '/creator', icon: 'download', title: 'Export TDS', text: 'Preview, print or download one or many TDS as PDF.' },
    { link: '/database/products/new', icon: 'plus', title: 'Add a product', text: 'Create a new TDS from scratch.', editorOnly: true },
    { link: '/database/products', icon: 'database', title: 'Product data', text: 'Search and maintain the master data.' },
    { link: '/database/texts', icon: 'type', title: 'TDS wording', text: 'Edit fixed text blocks and header rules.', editorOnly: true },
  ];
  readonly actions = computed(() => this.allActions.filter((a) => !a.editorOnly || this.auth.isEditor()));

  readonly greeting = computed(() => {
    const h = new Date().getHours();
    return this.i18n.t(h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening');
  });

  constructor() {
    const toast = inject(ToastService);
    forkJoin({ stats: this.api.stats(), recent: this.api.history({ limit: 8, hideImports: true }) }).subscribe({
      next: ({ stats, recent }) => {
        this.stats.set(stats);
        this.recent.set(recent.items);
      },
      error: (e) => toast.error(e, 'Could not load the dashboard'),
    });
  }
}
