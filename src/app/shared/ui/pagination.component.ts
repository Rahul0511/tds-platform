import { Component, Signal, WritableSignal, computed, input, model, signal } from '@angular/core';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { IconComponent } from './icon.component';

export const PAGE_SIZES = [10, 25, 50, 100];

/**
 * Client-side pagination over a list that is already loaded.
 * Call reset() when a filter or search changes, so the user starts on page 1.
 */
export class Paginator<T> {
  readonly page = signal(1);
  readonly pageSize: WritableSignal<number>;
  readonly total = computed(() => this.source().length);
  readonly pageCount = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  /** Current page, kept within range when the list shrinks. */
  readonly current = computed(() => Math.min(this.page(), this.pageCount()));
  readonly items = computed(() => {
    const start = (this.current() - 1) * this.pageSize();
    return this.source().slice(start, start + this.pageSize());
  });

  constructor(
    private source: Signal<T[]>,
    pageSize = 25,
  ) {
    this.pageSize = signal(pageSize);
  }

  reset() {
    this.page.set(1);
  }
}

/** "Showing 1–25 of 230", rows per page, and page buttons with gaps (1 … 4 5 6 … 10). */
@Component({
  selector: 'app-pagination',
  imports: [IconComponent, TranslatePipe],
  host: { class: 'block' },
  template: `
    @if (total() > 0) {
      <nav
        class="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm"
        [class]="compact() ? 'justify-between px-3 py-2' : 'justify-between border-t border-line px-4 py-3'"
        [attr.aria-label]="'Pagination' | t"
      >
        <span class="text-muted" [class.text-xs]="compact()">
          @if (compact()) {
            {{ '{range} of {total}' | t: { range: first() + '–' + last(), total: total() } }}
          } @else {
            {{ 'Showing {range} of {total}' | t: { range: first() + '–' + last(), total: total() } }}
          }
        </span>

        <div class="flex items-center gap-3">
          @if (!compact()) {
            <label class="flex items-center gap-2 text-xs text-muted">
              {{ 'Rows per page' | t }}
              <select class="input h-8 w-[4.5rem] py-0 text-xs" [value]="pageSize()" (change)="changeSize($any($event.target).value)">
                @for (s of sizes(); track s) {
                  <option [value]="s" [selected]="s === pageSize()">{{ s }}</option>
                }
              </select>
            </label>
          }

          @if (pageCount() > 1) {
            <div class="flex items-center gap-1">
              <button type="button" class="btn-icon h-8 w-8" [disabled]="page() <= 1" [attr.aria-label]="'Previous page' | t" (click)="go(page() - 1)">
                <app-icon name="chevron-down" [size]="16" class="rotate-90" />
              </button>
              @if (!compact()) {
                @for (p of pages(); track $index) {
                  @if (p === null) {
                    <span class="w-6 text-center text-subtle" aria-hidden="true">…</span>
                  } @else {
                    <button
                      type="button"
                      class="h-8 min-w-8 rounded-lg px-2 text-xs font-medium tabular-nums transition"
                      [class]="p === page() ? 'bg-brand-600 text-white shadow-sm' : 'text-ink-2 hover:bg-surface-2'"
                      [attr.aria-current]="p === page() ? 'page' : null"
                      [attr.aria-label]="'Page {n}' | t: { n: p }"
                      (click)="go(p)"
                    >
                      {{ p }}
                    </button>
                  }
                }
              } @else {
                <span class="px-1 text-xs tabular-nums text-muted">{{ page() }} / {{ pageCount() }}</span>
              }
              <button type="button" class="btn-icon h-8 w-8" [disabled]="page() >= pageCount()" [attr.aria-label]="'Next page' | t" (click)="go(page() + 1)">
                <app-icon name="chevron-down" [size]="16" class="-rotate-90" />
              </button>
            </div>
          }
        </div>
      </nav>
    }
  `,
})
export class PaginationComponent {
  readonly total = input.required<number>();
  readonly page = model.required<number>();
  readonly pageSize = model.required<number>();
  readonly sizes = input(PAGE_SIZES);
  /** Small variant for narrow side panels: no page numbers, no size selector. */
  readonly compact = input(false);

  readonly pageCount = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  readonly first = computed(() => (this.total() ? (Math.min(this.page(), this.pageCount()) - 1) * this.pageSize() + 1 : 0));
  readonly last = computed(() => Math.min(this.total(), this.first() + this.pageSize() - 1));

  /** Page numbers with null for a gap: 1 … 4 5 6 … 20 */
  readonly pages = computed(() => {
    const n = this.pageCount();
    const cur = Math.min(this.page(), n);
    const out: (number | null)[] = [];
    for (let p = 1; p <= n; p++) {
      if (p === 1 || p === n || Math.abs(p - cur) <= 1) out.push(p);
      else if (out[out.length - 1] !== null) out.push(null);
    }
    return out;
  });

  go(p: number) {
    this.page.set(Math.min(Math.max(1, p), this.pageCount()));
  }

  changeSize(value: string) {
    // Keep the first visible row on screen when the page size changes.
    const firstRow = this.first();
    const size = Number(value);
    this.pageSize.set(size);
    this.page.set(Math.max(1, Math.ceil(firstRow / size)));
  }
}
