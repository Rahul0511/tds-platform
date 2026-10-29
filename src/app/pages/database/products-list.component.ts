import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth/auth.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { Product } from '../../core/models';
import { ScopeService } from '../../core/scope.service';
import { ToastService } from '../../core/toast.service';
import { IconComponent } from '../../shared/ui/icon.component';
import { PaginationComponent, Paginator } from '../../shared/ui/pagination.component';
import { TimeAgoPipe } from '../../shared/ui/time-ago.pipe';

type SortKey = 'sales_code' | 'name' | 'bu_code' | 'region_code' | 'product_type' | 'version' | 'modified_at';

@Component({
  selector: 'app-products-list',
  imports: [FormsModule, RouterLink, IconComponent, PaginationComponent, TimeAgoPipe, TranslatePipe],
  template: `
    <div class="page">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="page-title">{{ 'Products' | t }}</h1>
          <p class="page-subtitle">{{ 'One product is one TDS. You see the regions and business units you have access to.' | t }}</p>
        </div>
        @if (auth.isEditor()) {
          <a routerLink="new" class="btn-primary"><app-icon name="plus" [size]="16" /> {{ 'New product' | t }}</a>
        }
      </div>

      <div class="card mt-6 overflow-hidden">
        <div class="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <div class="relative w-full max-w-xs">
            <app-icon name="search" [size]="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
            <input class="input pl-9" type="search" [placeholder]="'Search number, name or text' | t" [attr.aria-label]="'Search products' | t" [ngModel]="search()" (ngModelChange)="search.set($event); pager.reset()" />
          </div>
          <select class="input w-48" [attr.aria-label]="'Filter by product type' | t" [ngModel]="type()" (ngModelChange)="type.set($event); pager.reset()">
            <option value="">{{ 'All product types' | t }}</option>
            @for (t of types(); track t) {
              <option [value]="t">{{ t }}</option>
            }
          </select>
          <span class="ml-auto text-sm text-muted">{{ '{n} products' | t: { n: rows().length } }}</span>
        </div>

        <div class="overflow-x-auto">
          <table class="table">
            <thead>
              <tr>
                @for (c of columns; track c.key) {
                  <th [attr.aria-sort]="sort() === c.key ? (asc() ? 'ascending' : 'descending') : null">
                    <button type="button" class="inline-flex items-center gap-1 hover:text-ink" (click)="sortBy(c.key)">
                      {{ c.label | t }}
                      <app-icon name="chevron-down" [size]="12" class="transition" [class]="sort() === c.key ? (asc() ? 'rotate-180 text-ink' : 'text-ink') : 'opacity-0'" />
                    </button>
                  </th>
                }
                <th>{{ 'Template' | t }}</th>
                <th class="text-right"><span class="sr-only">{{ 'Actions' | t }}</span></th>
              </tr>
            </thead>
            <tbody>
              @for (p of pager.items(); track p.id) {
                @let editable = auth.can('editor', p.region_code, p.bu_code);
                <tr>
                  <td class="whitespace-nowrap font-mono text-xs text-ink-2">{{ p.sales_code ?? '–' }}</td>
                  <td class="font-medium text-ink">
                    @if (editable) {
                      <a [routerLink]="[p.id]" class="hover:text-brand-600 dark:hover:text-brand-400">{{ p.name }}</a>
                    } @else {
                      {{ p.name }}
                    }
                  </td>
                  <td><span class="badge-neutral" [title]="scope.buName(p.bu_code)">{{ p.bu_code }}</span></td>
                  <td><span class="badge-neutral" [title]="scope.regionName(p.region_code)">{{ p.region_code }}</span></td>
                  <td class="whitespace-nowrap text-ink-2">{{ p.product_type }}</td>
                  <td class="tabular-nums text-ink-2">v{{ p.version }}</td>
                  <td class="whitespace-nowrap text-muted">
                    {{ p.modified_at | timeAgo }}
                    @if (p.modified_by) {
                      <span class="text-subtle">· {{ p.modified_by }}</span>
                    }
                  </td>
                  <td class="max-w-[14rem] truncate text-muted" [title]="p.template_name">{{ p.template_code }}</td>
                  <td>
                    <div class="flex justify-end gap-1">
                      <a [routerLink]="['/creator']" [queryParams]="{ id: p.id }" class="btn-icon h-8 w-8" [title]="'View TDS' | t" [attr.aria-label]="'View TDS of {code}' | t: { code: p.sales_code ?? p.name }">
                        <app-icon name="eye" [size]="16" />
                      </a>
                      @if (editable) {
                        <a [routerLink]="[p.id]" class="btn-icon h-8 w-8" [title]="'Edit' | t" [attr.aria-label]="'Edit {name}' | t: { name: p.sales_code ?? p.name }"><app-icon name="pencil" [size]="16" /></a>
                        <a [routerLink]="['new']" [queryParams]="{ copyOf: p.id }" class="btn-icon h-8 w-8" [title]="'Copy' | t" [attr.aria-label]="'Copy {code}' | t: { code: p.sales_code ?? p.name }">
                          <app-icon name="copy" [size]="16" />
                        </a>
                      }
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="9" class="py-12 text-center text-muted">{{ (loading() ? 'Loading…' : 'No products match.') | t }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <app-pagination [total]="pager.total()" [(page)]="pager.page" [(pageSize)]="pager.pageSize" />
      </div>
    </div>
  `,
})
export class ProductsListComponent {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  readonly auth = inject(AuthService);
  readonly scope = inject(ScopeService);

  readonly columns: { key: SortKey; label: string }[] = [
    { key: 'sales_code', label: 'Product number' },
    { key: 'name', label: 'Product name' },
    { key: 'bu_code', label: 'BU' },
    { key: 'region_code', label: 'Region' },
    { key: 'product_type', label: 'Product type' },
    { key: 'version', label: 'Version' },
    { key: 'modified_at', label: 'Last change' },
  ];

  readonly products = signal<Product[]>([]);
  readonly loading = signal(true);
  readonly search = signal('');
  readonly type = signal('');
  readonly sort = signal<SortKey>('sales_code');
  readonly asc = signal(true);

  readonly types = computed(() => [...new Set(this.products().map((p) => p.product_type ?? ''))].filter(Boolean).sort());
  readonly rows = computed(() => {
    const q = this.search().trim().toLowerCase();
    const t = this.type();
    const key = this.sort();
    const dir = this.asc() ? 1 : -1;
    return this.products()
      .filter((p) => (!t || p.product_type === t) && (!q || [p.sales_code ?? '', p.name, JSON.stringify(p.data)].some((v) => v.toLowerCase().includes(q))))
      .sort((a, b) => {
        const x = a[key] ?? '';
        const y = b[key] ?? '';
        return x < y ? -dir : x > y ? dir : 0;
      });
  });
  readonly pager = new Paginator(this.rows, 25);

  constructor() {
    // The list follows the region and business unit chosen in the top bar.
    effect(() => {
      const filter = this.scope.filter();
      untracked(() => {
        this.loading.set(true);
        this.api.products(filter).subscribe({
          next: (list) => {
            this.products.set(list);
            this.loading.set(false);
            this.pager.reset();
          },
          error: (e) => {
            this.loading.set(false);
            this.toast.error(e, 'Could not load products');
          },
        });
      });
    });
  }

  sortBy(key: SortKey) {
    if (this.sort() === key) this.asc.update((v) => !v);
    else {
      this.sort.set(key);
      this.asc.set(true);
    }
  }
}
