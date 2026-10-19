import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { debounceTime, forkJoin, of, switchMap } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { FieldDef, HeaderRule, HistoryEntry, Lookup, Meta, Product, ProductInput, TdsDocument } from '../../core/models';
import { DialogService } from '../../core/dialog.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { ToastService } from '../../core/toast.service';
import { IconComponent } from '../../shared/ui/icon.component';
import { RatingInputComponent } from '../../shared/rating-input.component';
import { TdsDocumentComponent } from '../../shared/tds-document.component';

type ProductForm = { [K in keyof ProductInput]: FormControl<ProductInput[K] | string | null> };

const IDENTITY: (keyof ProductInput)[] = ['sales_code', 'designation', 'header', 'description', 'substrate'];

@Component({
  selector: 'app-product-form',
  imports: [ReactiveFormsModule, RouterLink, DatePipe, RatingInputComponent, TdsDocumentComponent, IconComponent, TranslatePipe],
  templateUrl: './product-form.component.html',
})
export class ProductFormComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  private toast = inject(ToastService);
  private destroyRef = inject(DestroyRef);
  private dialog = inject(DialogService);
  readonly i18n = inject(I18nService);

  /** Route param (edit) and ?copyOf= (duplicate an existing product). */
  readonly id = input<string>();
  readonly copyOf = input<string>();

  readonly meta = signal<Meta | null>(null);
  readonly lookups = signal<Lookup[]>([]);
  readonly headers = signal<HeaderRule[]>([]);
  readonly product = signal<Product | null>(null);
  readonly history = signal<HistoryEntry[]>([]);
  readonly preview = signal<TdsDocument | null>(null);
  readonly saving = signal(false);
  readonly loaded = signal(false);

  readonly isEdit = computed(() => !!this.id() && this.id() !== 'new');
  readonly fields = computed(() => this.meta()?.fields ?? []);
  readonly identityFields = computed(() => this.fields().filter((f) => IDENTITY.includes(f.key)));
  readonly ratingFields = computed(() => this.fields().filter((f) => f.type === 'rating'));
  readonly technicalFields = computed(() => this.fields().filter((f) => f.type !== 'rating' && !IDENTITY.includes(f.key)));
  readonly labels = computed(() => Object.fromEntries(this.fields().map((f) => [f.key, f.label])) as Record<string, string>);

  readonly form = new FormGroup<ProductForm>({
    sales_code: new FormControl('', Validators.required),
    designation: new FormControl('', Validators.required),
    header: new FormControl('', Validators.required),
    description: new FormControl(null),
    substrate: new FormControl(null),
    gloss: new FormControl(null),
    rub: new FormControl(null),
    blocking: new FormControl(null),
    drying: new FormControl(null),
    cof: new FormControl(null),
    hot_foil: new FormControl(null),
    foil_lamination: new FormControl(null),
    uv_coating: new FormControl(null),
    gluability: new FormControl(null),
    viscosity: new FormControl(null),
    density: new FormControl(null),
    solids: new FormControl(null),
    ph: new FormControl(null),
    double_sided: new FormControl(null),
    heat_resistance: new FormControl(null),
    foil_wrapping: new FormControl(null),
    deep_freezing: new FormControl(null),
    shelf_life_months: new FormControl(null),
  });
  readonly remark = new FormControl('', { nonNullable: true });

  ngOnInit() {
    const editId = this.isEdit() ? Number(this.id()) : null;
    const sourceId = editId ?? (this.copyOf() ? Number(this.copyOf()) : null);
    if (editId) this.remark.addValidators(Validators.required);

    forkJoin({
      meta: this.api.meta$,
      lookups: this.api.lookups(),
      headers: this.api.headers(),
      product: sourceId ? this.api.product(sourceId) : of(null),
      history: editId ? this.api.productHistory(editId) : of([]),
    }).subscribe({
      next: ({ meta, lookups, headers, product, history }) => {
        this.meta.set(meta);
        this.lookups.set(lookups);
        this.headers.set(headers);
        this.history.set(history);
        if (product) {
          this.patch(product);
          if (editId) this.product.set(product);
          else this.form.controls.sales_code.setValue('');
        }
        this.loaded.set(true);
        this.refreshPreview();
      },
      error: (e) => this.toast.error(e, 'Could not load the product'),
    });

    this.form.valueChanges
      .pipe(
        debounceTime(400),
        switchMap(() => this.api.tdsPreview(this.draft())),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({ next: (doc) => this.preview.set(doc), error: () => {} });
  }

  options(f: FieldDef): string[] {
    if (f.key === 'header') return this.headers().map((h) => h.code);
    return this.lookups().filter((l) => l.category === f.lookup).map((l) => l.value);
  }

  /** Adds a value to the field's drop-down list and selects it. */
  async addOption(f: FieldDef) {
    if (!f.lookup) return;
    const numeric = f.type === 'number' || f.type === 'integer';
    const label = this.i18n.t(f.label);
    const value = await this.dialog.prompt({
      title: this.i18n.t('Add a value to {list}', { list: label }),
      message: 'The value becomes available in this drop-down for every product.',
      confirmText: 'Add value',
      input: {
        label: 'New value',
        placeholder: numeric ? this.i18n.t('e.g. {example}', { example: f.type === 'integer' ? '18' : '1.10' }) : 'Type the new value',
        required: true,
      },
    });
    if (!value) return;
    this.api.addLookup(f.lookup, value).subscribe({
      next: (l) => {
        this.lookups.update((list) => [...list, { ...l, used_by: 0 }]);
        const c = this.control(f.key);
        c.setValue(l.value);
        c.markAsDirty();
        this.toast.success(this.i18n.t('Added "{value}" to {list}', { value: l.value, list: label }));
      },
      error: (e) => this.toast.error(e, 'Could not add the value'),
    });
  }

  control(key: keyof ProductInput) {
    return this.form.controls[key] as FormControl;
  }

  errorOf(key: keyof ProductInput): string | null {
    const c = this.form.controls[key];
    if (!c.errors || !(c.touched || c.dirty)) return null;
    if (c.errors['server']) return c.errors['server'];
    if (c.errors['required']) return this.i18n.t('{field} is required', { field: this.i18n.t(this.labels()[key]) });
    return null;
  }

  save() {
    this.form.markAllAsTouched();
    this.remark.markAsTouched();
    if (this.form.invalid || this.remark.invalid) {
      this.toast.error(null, 'Please fill in the required fields');
      return;
    }
    this.saving.set(true);
    const data = this.draft() as ProductInput;
    const current = this.product();
    const req = current ? this.api.updateProduct(current.id, data, this.remark.value) : this.api.createProduct(data, this.remark.value);
    req.subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.toast.success(
          current
            ? this.i18n.t('Saved {code} as version {v}', { code: saved.sales_code, v: saved.version })
            : this.i18n.t('Created {code}', { code: saved.sales_code }),
        );
        this.router.navigate(['/database/products']);
      },
      error: (e: HttpErrorResponse) => {
        this.saving.set(false);
        for (const [key, msg] of Object.entries((e.error?.fields ?? {}) as Record<string, string>)) {
          const c = this.form.controls[key as keyof ProductInput];
          c?.setErrors({ server: msg });
          c?.markAsTouched();
        }
        this.toast.error(e, 'Could not save');
      },
    });
  }

  async remove() {
    const p = this.product();
    if (!p) return;
    const remark = await this.dialog.prompt({
      title: this.i18n.t('Delete {name}?', { name: `${p.sales_code} ${p.designation}` }),
      message: 'The product and its TDS are removed. The change history is kept.',
      confirmText: 'Delete product',
      tone: 'danger',
      input: { label: 'Reason for deleting', placeholder: 'e.g. Product discontinued', required: true, multiline: true },
    });
    if (remark === null) return;
    this.api.deleteProduct(p.id, remark).subscribe({
      next: () => {
        this.toast.success(this.i18n.t('Deleted {name}', { name: p.sales_code }));
        this.router.navigate(['/database/products']);
      },
      error: (e) => this.toast.error(e, 'Could not delete'),
    });
  }

  changedFields(entry: HistoryEntry) {
    return Object.entries(entry.changes ?? {}).map(([key, [from, to]]) => ({ label: this.labels()[key] ?? key, from, to }));
  }

  private draft() {
    return { ...this.form.getRawValue(), id: this.product()?.id };
  }

  private refreshPreview() {
    this.api.tdsPreview(this.draft()).subscribe({ next: (doc) => this.preview.set(doc), error: () => {} });
  }

  // Lookup-backed selects work with strings, so numeric values are patched as text.
  private patch(p: Product) {
    const lookupKeys = new Set(this.fields().filter((f) => f.lookup).map((f) => f.key));
    const values: Record<string, unknown> = {};
    for (const key of Object.keys(this.form.controls) as (keyof ProductInput)[]) {
      const v = p[key];
      values[key] = v !== null && lookupKeys.has(key) ? String(v) : v;
    }
    this.form.reset(values as never);
  }
}
