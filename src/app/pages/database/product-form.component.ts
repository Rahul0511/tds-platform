import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { debounceTime, forkJoin, of, startWith, switchMap } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth/auth.service';
import { DialogService } from '../../core/dialog.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { FieldDef, FieldValue, HistoryEntry, Lookup, Meta, Product, ProductInput, TdsDocument, Template } from '../../core/models';
import { ScopeService } from '../../core/scope.service';
import { ToastService } from '../../core/toast.service';
import { RatingInputComponent } from '../../shared/rating-input.component';
import { TableInputComponent } from '../../shared/table-input.component';
import { TdsDocumentComponent } from '../../shared/tds-document.component';
import { IconComponent } from '../../shared/ui/icon.component';

interface FieldGroup {
  id: string;
  title: string;
  fields: FieldDef[];
}

const SCOPE_LABELS: Record<string, string> = { region_code: 'Region', bu_code: 'Business unit', template_id: 'Template' };

/**
 * One product = one TDS. The template decides which fields the form shows:
 * the standard fields on top, then the fields of each template section in
 * print order. Values of fields the template does not use are kept.
 */
@Component({
  selector: 'app-product-form',
  imports: [ReactiveFormsModule, FormsModule, RouterLink, DatePipe, RatingInputComponent, TableInputComponent, TdsDocumentComponent, IconComponent, TranslatePipe],
  templateUrl: './product-form.component.html',
})
export class ProductFormComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  private toast = inject(ToastService);
  private destroyRef = inject(DestroyRef);
  private dialog = inject(DialogService);
  readonly i18n = inject(I18nService);
  readonly auth = inject(AuthService);
  readonly scope = inject(ScopeService);

  /** Route param (edit) and ?copyOf= (duplicate an existing product). */
  readonly id = input<string>();
  readonly copyOf = input<string>();

  readonly meta = signal<Meta | null>(null);
  readonly lookups = signal<Lookup[]>([]);
  readonly templates = signal<Template[]>([]);
  readonly product = signal<Product | null>(null);
  readonly history = signal<HistoryEntry[]>([]);
  readonly preview = signal<TdsDocument | null>(null);
  readonly saving = signal(false);
  readonly loaded = signal(false);
  readonly errors = signal<Record<string, string>>({});

  readonly isEdit = computed(() => !!this.id() && this.id() !== 'new');
  readonly fieldMap = computed(() => new Map((this.meta()?.fields ?? []).map((f) => [f.key, f])));

  // ---- Region, business unit, template ----
  readonly scopeForm = new FormGroup({
    region_code: new FormControl('', { nonNullable: true }),
    bu_code: new FormControl('', { nonNullable: true }),
    template_id: new FormControl<number | null>(null),
  });
  private readonly scopeValue = toSignal(this.scopeForm.valueChanges.pipe(startWith(this.scopeForm.getRawValue())), { initialValue: this.scopeForm.getRawValue() });

  /** Business units and regions where the user may edit. */
  readonly editableBus = computed(() => this.scope.businessUnits().filter((b) => this.scope.regions().some((r) => this.auth.can('editor', r.code, b.code))));
  readonly editableRegions = computed(() => {
    const bu = this.scopeValue().bu_code ?? '';
    return this.scope.regions().filter((r) => this.auth.can('editor', r.code, bu));
  });
  readonly templateOptions = computed(() => {
    const { bu_code, region_code } = this.scopeValue();
    const current = this.product()?.template_id;
    return this.templates().filter((t) => t.bu_code === bu_code && (!t.region_code || t.region_code === region_code) && (t.active || t.id === current));
  });
  readonly template = computed(() => this.templates().find((t) => t.id === Number(this.scopeValue().template_id)) ?? null);

  // ---- Field values: one control per field of the catalog ----
  readonly form = new FormGroup<Record<string, FormControl<FieldValue>>>({});
  readonly remark = new FormControl('', { nonNullable: true });

  /** Product card (standard identity fields), then one card per template section. */
  readonly groups = computed<FieldGroup[]>(() => {
    const map = this.fieldMap();
    const fields = this.meta()?.fields ?? [];
    const identity = fields.filter((f) => f.group === 'identity');
    const tpl = this.template();
    const out: FieldGroup[] = [{ id: 'identity', title: 'Product', fields: identity }];
    for (const g of tpl?.fields ?? []) {
      const list = g.keys.map((k) => map.get(k)).filter((f): f is FieldDef => !!f && f.group !== 'identity');
      if (list.length) out.push({ id: g.section, title: g.title || 'Values', fields: list });
    }
    return out;
  });

  ngOnInit() {
    const editId = this.isEdit() ? Number(this.id()) : null;
    const sourceId = editId ?? (this.copyOf() ? Number(this.copyOf()) : null);

    forkJoin({
      meta: this.api.meta$,
      lookups: this.api.lookups(),
      templates: this.api.templates(),
      org: this.api.org(),
      product: sourceId ? this.api.product(sourceId) : of(null),
      history: editId ? this.api.productHistory(editId) : of([]),
    }).subscribe({
      next: ({ meta, lookups, templates, org, product, history }) => {
        this.scope.org.set(org);
        this.meta.set(meta);
        this.lookups.set(lookups);
        this.templates.set(templates);
        this.history.set(history);
        for (const f of meta.fields) this.form.addControl(f.key, new FormControl<FieldValue>(null));
        if (product) {
          this.patch(product);
          if (editId) this.product.set(product);
          else this.form.controls['sales_code'].setValue(null);
        } else {
          this.pickDefaults();
        }
        this.loaded.set(true);
        this.watch();
      },
      error: (e) => this.toast.error(e, 'Could not load the product'),
    });
  }

  /** A new product starts in the workspace's region and business unit, if the user may edit there. */
  private pickDefaults() {
    const ws = this.scope.filter();
    const bus = this.editableBus();
    const bu = bus.find((b) => b.code === ws.bu)?.code ?? bus[0]?.code ?? '';
    const regions = this.scope.regions().filter((r) => this.auth.can('editor', r.code, bu));
    const region = regions.find((r) => r.code === ws.region)?.code ?? regions[0]?.code ?? '';
    this.scopeForm.setValue({ region_code: region, bu_code: bu, template_id: null });
    this.fixTemplate();
  }

  /** Keeps region and template valid when the business unit or region changes. */
  onBuChange() {
    const regions = this.editableRegions();
    if (!regions.some((r) => r.code === this.scopeForm.controls.region_code.value)) this.scopeForm.controls.region_code.setValue(regions[0]?.code ?? '');
    this.fixTemplate();
  }

  fixTemplate() {
    const options = this.templateOptions();
    const current = this.scopeForm.controls.template_id.value;
    if (!options.some((t) => t.id === current)) this.scopeForm.controls.template_id.setValue(options[0]?.id ?? null);
  }

  private watch() {
    // Live preview of the unsaved values.
    this.form.valueChanges
      .pipe(
        startWith(null),
        debounceTime(400),
        switchMap(() => {
          const draft = this.draft();
          return draft.template_id && draft.region_code && draft.bu_code ? this.api.tdsPreview({ ...draft, id: this.product()?.id }) : of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({ next: (doc) => this.preview.set(doc), error: () => {} });
    this.scopeForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.form.updateValueAndValidity());
  }

  options(f: FieldDef): string[] {
    return this.lookups()
      .filter((l) => l.category === f.lookup)
      .map((l) => l.value);
  }

  control(key: string) {
    return this.form.controls[key] as FormControl;
  }

  errorOf(key: string): string | null {
    return this.errors()[key] ?? null;
  }

  /** Adds a value to the field's drop-down list and selects it. The server checks who may do that. */
  async addOption(f: FieldDef) {
    if (!f.lookup) return;
    const label = this.i18n.t(f.label);
    const value = await this.dialog.prompt({
      title: this.i18n.t('Add a value to {list}', { list: label }),
      message: 'The value becomes available in this drop-down for every product.',
      confirmText: 'Add value',
      input: { label: 'New value', placeholder: 'Type the new value', required: true },
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

  save() {
    this.remark.markAsTouched();
    const missing: Record<string, string> = {};
    for (const f of this.meta()?.fields ?? []) {
      const v = this.control(f.key).value;
      if (f.required && (v === null || v === '')) missing[f.key] = this.i18n.t('{field} is required', { field: this.i18n.t(f.label) });
    }
    const draft = this.draft();
    for (const k of ['region_code', 'bu_code', 'template_id'] as const) {
      if (!draft[k]) missing[k] = this.i18n.t('{field} is required', { field: this.i18n.t(SCOPE_LABELS[k]) });
    }
    this.errors.set(missing);
    if (Object.keys(missing).length || (this.isEdit() && !this.remark.value.trim())) {
      this.toast.error(null, 'Please fill in the required fields');
      return;
    }
    this.saving.set(true);
    const current = this.product();
    const req = current ? this.api.updateProduct(current.id, draft, this.remark.value) : this.api.createProduct(draft, this.remark.value);
    req.subscribe({
      next: (saved) => {
        this.saving.set(false);
        const name = saved.sales_code ?? saved.name;
        this.toast.success(current ? this.i18n.t('Saved {code} as version {v}', { code: name, v: saved.version }) : this.i18n.t('Created {code}', { code: name }));
        this.router.navigate(['/database/products']);
      },
      error: (e: HttpErrorResponse) => {
        this.saving.set(false);
        this.errors.set(e.error?.fields ?? {});
        this.toast.error(e, 'Could not save');
      },
    });
  }

  async remove() {
    const p = this.product();
    if (!p) return;
    const remark = await this.dialog.prompt({
      title: this.i18n.t('Delete {name}?', { name: [p.sales_code, p.name].filter(Boolean).join(' ') }),
      message: 'The product and its TDS are removed. The change history is kept.',
      confirmText: 'Delete product',
      tone: 'danger',
      input: { label: 'Reason for deleting', placeholder: 'e.g. Product discontinued', required: true, multiline: true },
    });
    if (remark === null) return;
    this.api.deleteProduct(p.id, remark).subscribe({
      next: () => {
        this.toast.success(this.i18n.t('Deleted {name}', { name: p.sales_code ?? p.name }));
        this.router.navigate(['/database/products']);
      },
      error: (e) => this.toast.error(e, 'Could not delete'),
    });
  }

  changedFields(entry: HistoryEntry) {
    const map = this.fieldMap();
    const show = (v: unknown) => (v === null || v === undefined ? '–' : Array.isArray(v) ? this.i18n.t('{n} rows', { n: v.length }) : String(v));
    return Object.entries(entry.changes ?? {}).map(([key, [from, to]]) => ({
      label: map.get(key)?.label ?? SCOPE_LABELS[key] ?? key,
      from: show(from),
      to: show(to),
    }));
  }

  private draft(): ProductInput {
    const s = this.scopeForm.getRawValue();
    const data: Record<string, FieldValue> = {};
    for (const [k, c] of Object.entries(this.form.controls)) data[k] = c.value;
    return { region_code: s.region_code, bu_code: s.bu_code, template_id: Number(s.template_id), data };
  }

  // Lookup-backed selects work with strings, so numeric values are patched as text.
  private patch(p: Product) {
    this.scopeForm.setValue({ region_code: p.region_code, bu_code: p.bu_code, template_id: p.template_id });
    const map = this.fieldMap();
    for (const [key, c] of Object.entries(this.form.controls)) {
      const v = p.data[key] ?? null;
      c.setValue(v !== null && map.get(key)?.lookup ? String(v) : v, { emitEvent: false });
    }
    this.form.updateValueAndValidity();
  }
}
