import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { DialogService } from '../../core/dialog.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { Lookup, LookupCategory } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { IconComponent } from '../../shared/ui/icon.component';

/** Controlled drop-down values, replaces the Dropdown_EN sheet. */
@Component({
  selector: 'app-lookups',
  imports: [FormsModule, IconComponent, TranslatePipe],
  template: `
    <div class="page">
      <h1 class="page-title">{{ 'Lookups' | t }}</h1>
      <p class="page-subtitle">{{ 'Products can only use values from these lists, which keeps spelling the same on every TDS.' | t }}</p>

      <div class="mt-6 grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <nav class="card h-fit p-2" [attr.aria-label]="'Lookup categories' | t">
          @for (c of categories(); track c.key) {
            <button
              type="button"
              class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition"
              [class]="active() === c.key ? 'bg-brand-500/10 font-medium text-brand-700 dark:text-brand-300' : 'text-ink-2 hover:bg-surface-2'"
              (click)="active.set(c.key)"
            >
              {{ c.label | t }}
              <span class="rounded-md bg-surface-2 px-1.5 text-xs tabular-nums text-muted">{{ count(c.key) }}</span>
            </button>
          }
        </nav>

        <section class="card overflow-hidden">
          <div class="card-header">
            <h2 class="card-title">{{ activeLabel() | t }}</h2>
            <span class="text-xs text-muted">{{ 'Values used by a product cannot be deleted' | t }}</span>
          </div>
          <form class="flex gap-2 border-b border-line p-4" (ngSubmit)="add()">
            <label class="sr-only" for="new-value">{{ 'New value' | t }}</label>
            <input id="new-value" name="value" class="input" [placeholder]="'Add a value to {list}' | t: { list: (activeLabel() | t) }" [(ngModel)]="newValue" />
            <button type="submit" class="btn-primary" [disabled]="!newValue.trim()"><app-icon name="plus" [size]="16" /> {{ 'Add' | t }}</button>
          </form>
          <ul class="divide-y divide-line">
            @for (l of items(); track l.id) {
              <li class="group flex items-center gap-3 px-5 py-3 text-sm">
                <span class="flex-1 text-ink">{{ l.value }}</span>
                @if (l.used_by) {
                  <span class="badge-neutral">{{ (l.used_by === 1 ? '1 product' : '{n} products') | t: { n: l.used_by } }}</span>
                } @else {
                  <span class="text-xs text-subtle">{{ 'unused' | t }}</span>
                }
                <button
                  type="button"
                  class="btn-icon h-8 w-8 hover:!text-red-600"
                  [disabled]="l.used_by > 0"
                  [title]="(l.used_by > 0 ? 'Still used by products' : 'Delete') | t"
                  [attr.aria-label]="'Delete {name}' | t: { name: l.value }"
                  (click)="remove(l)"
                >
                  <app-icon name="trash" [size]="16" />
                </button>
              </li>
            } @empty {
              <li class="px-5 py-10 text-center text-sm text-muted">{{ 'No values yet.' | t }}</li>
            }
          </ul>
        </section>
      </div>
    </div>
  `,
})
export class LookupsComponent {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private dialog = inject(DialogService);
  private i18n = inject(I18nService);

  readonly categories = signal<LookupCategory[]>([]);
  readonly lookups = signal<Lookup[]>([]);
  readonly active = signal('substrate');
  newValue = '';

  readonly items = computed(() => this.lookups().filter((l) => l.category === this.active()));
  readonly activeLabel = computed(() => this.categories().find((c) => c.key === this.active())?.label ?? '');

  constructor() {
    forkJoin({ meta: this.api.meta$, lookups: this.api.lookups() }).subscribe({
      next: ({ meta, lookups }) => {
        this.categories.set(meta.lookupCategories);
        this.lookups.set(lookups);
      },
      error: (e) => this.toast.error(e, 'Could not load lookups'),
    });
  }

  count(category: string) {
    return this.lookups().filter((l) => l.category === category).length;
  }

  add() {
    const value = this.newValue.trim();
    if (!value) return;
    this.api.addLookup(this.active(), value).subscribe({
      next: (l) => {
        this.lookups.update((list) => [...list, { ...l, used_by: 0 }]);
        this.newValue = '';
        this.toast.success(this.i18n.t('Added "{value}"', { value }));
      },
      error: (e) => this.toast.error(e, 'Could not add the value'),
    });
  }

  async remove(l: Lookup) {
    const ok = await this.dialog.confirm({
      title: this.i18n.t('Delete "{value}"?', { value: l.value }),
      message: 'It disappears from the drop-down.',
      confirmText: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    this.api.deleteLookup(l.id).subscribe({
      next: () => this.lookups.update((list) => list.filter((x) => x.id !== l.id)),
      error: (e) => this.toast.error(e, 'Could not delete the value'),
    });
  }
}
