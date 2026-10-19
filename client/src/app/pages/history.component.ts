import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime, switchMap } from 'rxjs';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth/auth.service';
import { TranslatePipe } from '../core/i18n/translate.pipe';
import { HistoryEntry } from '../core/models';
import { ToastService } from '../core/toast.service';
import { AvatarComponent } from '../shared/ui/avatar.component';
import { IconComponent } from '../shared/ui/icon.component';
import { PaginationComponent } from '../shared/ui/pagination.component';
import { TimeAgoPipe } from '../shared/ui/time-ago.pipe';

/** Who changed what and when, across all products. Paged on the server: the history only grows. */
@Component({
  selector: 'app-history',
  imports: [DatePipe, FormsModule, RouterLink, AvatarComponent, IconComponent, PaginationComponent, TimeAgoPipe, TranslatePipe],
  template: `
    <div class="page">
      <h1 class="page-title">{{ 'Change history' | t }}</h1>
      <p class="page-subtitle">{{ 'Every create, edit and delete, with user, date and the changed values.' | t }}</p>

      <div class="card mt-6 overflow-hidden">
        <div class="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <div class="relative w-full max-w-xs">
            <app-icon name="search" [size]="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
            <input class="input pl-9" type="search" [placeholder]="'Sales code, user or remark' | t" [attr.aria-label]="'Filter history' | t" [ngModel]="search()" (ngModelChange)="onSearch($event)" />
          </div>
          <label class="flex items-center gap-2 text-sm text-ink-2">
            <input type="checkbox" class="checkbox" [ngModel]="hideImports()" (ngModelChange)="hideImports.set($event); reload(1)" />
            {{ 'Hide imports' | t }}
          </label>
          <span class="ml-auto text-sm text-muted">{{ '{n} entries' | t: { n: total() } }}</span>
        </div>

        <div class="overflow-x-auto">
          <table class="table" [class.opacity-60]="loading()">
            <thead>
              <tr>
                <th>{{ 'When' | t }}</th>
                <th>{{ 'Product' | t }}</th>
                <th>{{ 'Action' | t }}</th>
                <th>{{ 'By' | t }}</th>
                <th>{{ 'Changes' | t }}</th>
              </tr>
            </thead>
            <tbody class="align-top">
              @for (h of entries(); track h.id) {
                <tr>
                  <td class="whitespace-nowrap text-muted" [title]="h.changed_at | date: 'dd.MM.yyyy HH:mm'">{{ h.changed_at | timeAgo }}</td>
                  <td class="whitespace-nowrap">
                    @if (auth.isEditor() && h.product_id && h.action !== 'deleted') {
                      <a [routerLink]="['/database/products', h.product_id]" class="font-mono text-xs text-brand-600 hover:underline dark:text-brand-400">{{ h.sales_code }}</a>
                    } @else {
                      <span class="font-mono text-xs text-ink-2">{{ h.sales_code }}</span>
                    }
                    <span class="ml-1.5 text-xs text-subtle">v{{ h.version }}</span>
                  </td>
                  <td><span [class]="badge[h.action]">{{ 'action:' + h.action | t }}</span></td>
                  <td>
                    <span class="flex items-center gap-2 whitespace-nowrap text-ink-2">
                      <app-avatar [name]="h.changed_by ?? '?'" [size]="24" /> {{ h.changed_by ?? '–' }}
                    </span>
                  </td>
                  <td class="text-muted">
                    @if (h.remark) {
                      <div class="whitespace-pre-line text-ink-2">{{ h.remark }}</div>
                    }
                    @if (h.action === 'updated' && h.changes) {
                      <div class="mt-1 flex flex-wrap gap-1">
                        @for (k of changedKeys(h); track k) {
                          <span class="badge-neutral">{{ k | t }}</span>
                        }
                      </div>
                    }
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="py-12 text-center text-muted">{{ (loading() ? 'Loading…' : 'No entries.') | t }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <app-pagination [total]="total()" [page]="page()" (pageChange)="reload($event)" [pageSize]="pageSize()" (pageSizeChange)="pageSize.set($event); reload(1)" />
      </div>
    </div>
  `,
})
export class HistoryComponent {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  readonly auth = inject(AuthService);

  readonly entries = signal<HistoryEntry[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(25);
  readonly loading = signal(true);
  readonly labels = signal<Record<string, string>>({});
  readonly search = signal('');
  readonly hideImports = signal(true);
  readonly badge: Record<HistoryEntry['action'], string> = {
    created: 'badge-green',
    updated: 'badge-blue',
    deleted: 'badge-red',
    imported: 'badge-neutral',
  };

  private requests = new Subject<void>();
  private searchInput = new Subject<void>();

  constructor() {
    this.api.meta$.subscribe({ next: (m) => this.labels.set(Object.fromEntries(m.fields.map((f) => [f.key, f.label]))), error: () => {} });
    // Latest request wins, so fast typing or paging never shows an older page.
    this.requests
      .pipe(
        switchMap(() => {
          this.loading.set(true);
          return this.api.history({
            limit: this.pageSize(),
            offset: (this.page() - 1) * this.pageSize(),
            search: this.search().trim(),
            hideImports: this.hideImports(),
          });
        }),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe({
        next: (res) => {
          this.entries.set(res.items);
          this.total.set(res.total);
          this.loading.set(false);
        },
        error: (e) => {
          this.loading.set(false);
          this.toast.error(e, 'Could not load the history');
        },
      });
    this.searchInput.pipe(debounceTime(300), takeUntilDestroyed()).subscribe(() => this.reload(1));
    this.reload(1);
  }

  onSearch(value: string) {
    this.search.set(value);
    this.searchInput.next();
  }

  reload(page: number) {
    this.page.set(page);
    this.requests.next();
  }

  changedKeys(h: HistoryEntry) {
    return Object.keys(h.changes ?? {}).map((k) => this.labels()[k] ?? k);
  }
}
