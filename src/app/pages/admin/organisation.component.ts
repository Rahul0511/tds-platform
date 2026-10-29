import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth/auth.service';
import { DialogService } from '../../core/dialog.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { OrgUnit } from '../../core/models';
import { ScopeService } from '../../core/scope.service';
import { ToastService } from '../../core/toast.service';
import { IconComponent } from '../../shared/ui/icon.component';
import { PaginationComponent, Paginator } from '../../shared/ui/pagination.component';

type Kind = 'regions' | 'business-units';

/**
 * Regions and business units (system admins), and the company line printed
 * in the TDS footer per region and business unit (BU admins of that scope).
 */
@Component({
  selector: 'app-organisation',
  imports: [FormsModule, IconComponent, PaginationComponent, TranslatePipe],
  template: `
    <div class="page">
      <h1 class="page-title">{{ 'Organisation' | t }}</h1>
      <p class="page-subtitle">{{ 'Access and products are organised by region and business unit.' | t }}</p>

      @if (scope.org(); as org) {
        <div class="mt-6 grid gap-6 lg:grid-cols-2">
          @for (k of kinds; track k.kind) {
            @let units = k.kind === 'regions' ? org.regions : org.businessUnits;
            <section class="card overflow-hidden">
              <div class="card-header">
                <h2 class="card-title">{{ k.title | t }}</h2>
                <span class="text-xs text-muted">{{ '{n} active' | t: { n: activeCount(units) } }}</span>
              </div>
              <ul class="divide-y divide-line">
                @for (u of units; track u.code) {
                  <li class="flex items-center gap-3 px-5 py-2.5" [class.opacity-60]="!u.active">
                    <span class="badge-neutral w-14 justify-center font-mono">{{ u.code }}</span>
                    @if (auth.isAdmin()) {
                      <input class="input h-8 flex-1 text-sm" [attr.aria-label]="'Name of {code}' | t: { code: u.code }" [ngModel]="u.name" (change)="rename(k.kind, u, $any($event.target).value)" />
                      <button type="button" class="btn-ghost btn-sm" (click)="toggle(k.kind, u)">{{ (u.active ? 'Switch off' : 'Switch on') | t }}</button>
                      <button type="button" class="btn-icon h-8 w-8 hover:!text-red-600" [attr.aria-label]="'Delete {name}' | t: { name: u.code }" (click)="remove(k.kind, u)">
                        <app-icon name="trash" [size]="16" />
                      </button>
                    } @else {
                      <span class="flex-1 text-sm text-ink">{{ u.name }}</span>
                    }
                  </li>
                }
              </ul>
              @if (auth.isAdmin()) {
                <form class="flex gap-2 border-t border-line p-4" (ngSubmit)="add(k.kind)">
                  <input class="input w-28 font-mono uppercase" [name]="k.kind + '-code'" [placeholder]="k.codeExample" [attr.aria-label]="'Code' | t" [(ngModel)]="newCode[k.kind]" />
                  <input class="input" [name]="k.kind + '-name'" [placeholder]="k.nameExample | t" [attr.aria-label]="'Name' | t" [(ngModel)]="newName[k.kind]" />
                  <button type="submit" class="btn-secondary" [disabled]="!newCode[k.kind].trim() || !newName[k.kind].trim()"><app-icon name="plus" [size]="16" /> {{ 'Add' | t }}</button>
                </form>
              }
            </section>
          }
        </div>

        <!-- Company line per region and business unit -->
        <section class="card mt-6 overflow-hidden">
          <div class="card-header">
            <h2 class="card-title">{{ 'Company line in the TDS footer' | t }}</h2>
            <span class="text-xs text-muted">{{ "Empty: the template's default is used." | t }}</span>
          </div>
          <div class="overflow-x-auto">
            <table class="table">
              <thead>
                <tr>
                  <th>{{ 'Region' | t }}</th>
                  <th>{{ 'Business unit' | t }}</th>
                  <th class="w-full">{{ 'Company line' | t }}</th>
                  <th><span class="sr-only">{{ 'Actions' | t }}</span></th>
                </tr>
              </thead>
              <tbody>
                @for (c of combosPager.items(); track c.region + c.bu) {
                  <tr>
                    <td class="font-mono text-xs">{{ c.region }}</td>
                    <td class="whitespace-nowrap">{{ scope.buName(c.bu) }}</td>
                    <td>
                      <input
                        class="input h-8 text-sm"
                        [attr.aria-label]="'Company line of {region} {bu}' | t: { region: c.region, bu: c.bu }"
                        [placeholder]="'e.g. **Siegwerk Switzerland AG**, Neuenburgstrasse 48, 3282 Bargen' | t"
                        [ngModel]="c.value"
                        (ngModelChange)="edits.set(c.region + '|' + c.bu, $event)"
                      />
                    </td>
                    <td>
                      <button type="button" class="btn-secondary btn-sm" [disabled]="!edits.has(c.region + '|' + c.bu)" (click)="saveLine(c.region, c.bu)">
                        <app-icon name="check" [size]="14" /> {{ 'Save' | t }}
                      </button>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="4" class="py-8 text-center text-muted">{{ 'You are not BU admin of any region and business unit.' | t }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <app-pagination [total]="combosPager.total()" [(page)]="combosPager.page" [(pageSize)]="combosPager.pageSize" />
        </section>
      } @else {
        <div class="mt-6 h-64 animate-pulse rounded-xl bg-surface-2"></div>
      }
    </div>
  `,
})
export class OrganisationComponent {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private dialog = inject(DialogService);
  private i18n = inject(I18nService);
  readonly auth = inject(AuthService);
  readonly scope = inject(ScopeService);

  readonly kinds: { kind: Kind; title: string; codeExample: string; nameExample: string }[] = [
    { kind: 'regions', title: 'Regions', codeExample: 'LATAM', nameExample: 'e.g. Latin America' },
    { kind: 'business-units', title: 'Business units', codeExample: 'LP', nameExample: 'e.g. Liquid Packaging' },
  ];
  newCode: Record<Kind, string> = { regions: '', 'business-units': '' };
  newName: Record<Kind, string> = { regions: '', 'business-units': '' };
  readonly edits = new Map<string, string>();
  private readonly tick = signal(0);

  /** Region × business unit pairs where the user is BU admin. */
  readonly combos = computed(() => {
    this.tick();
    const org = this.scope.org();
    if (!org) return [];
    const out: { region: string; bu: string; value: string }[] = [];
    for (const r of org.regions.filter((x) => x.active)) {
      for (const b of org.businessUnits.filter((x) => x.active)) {
        if (this.auth.can('bu_admin', r.code, b.code)) out.push({ region: r.code, bu: b.code, value: this.scope.companyLine(r.code, b.code) });
      }
    }
    return out;
  });  readonly combosPager = new Paginator(this.combos, 10);


  constructor() {
    this.scope.load(true);
  }

  activeCount(units: OrgUnit[]) {
    return units.filter((u) => u.active).length;
  }

  add(kind: Kind) {
    this.api.addOrgUnit(kind, { code: this.newCode[kind], name: this.newName[kind] }).subscribe({
      next: (u) => {
        this.newCode[kind] = '';
        this.newName[kind] = '';
        this.toast.success(this.i18n.t('Added {name}', { name: u.name }));
        this.scope.load(true);
      },
      error: (e) => this.toast.error(e, 'Could not add'),
    });
  }

  rename(kind: Kind, u: OrgUnit, name: string) {
    if (!name.trim() || name === u.name) return;
    this.api.updateOrgUnit(kind, u.code, { name }).subscribe({
      next: () => this.scope.load(true),
      error: (e) => this.toast.error(e, 'Could not save'),
    });
  }

  toggle(kind: Kind, u: OrgUnit) {
    this.api.updateOrgUnit(kind, u.code, { active: !u.active }).subscribe({
      next: () => this.scope.load(true),
      error: (e) => this.toast.error(e, 'Could not save'),
    });
  }

  async remove(kind: Kind, u: OrgUnit) {
    const ok = await this.dialog.confirm({
      title: this.i18n.t('Delete {name}?', { name: `${u.code} · ${u.name}` }),
      message: 'Only possible while no product or template uses it. Access given for it is removed.',
      confirmText: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    this.api.deleteOrgUnit(kind, u.code).subscribe({
      next: () => this.scope.load(true),
      error: (e) => this.toast.error(e, 'Could not delete'),
    });
  }

  saveLine(region: string, bu: string) {
    const key = `${region}|${bu}`;
    this.api.setScopeSetting({ region_code: region, bu_code: bu, key: 'company_line', value: this.edits.get(key) ?? '' }).subscribe({
      next: () => {
        this.edits.delete(key);
        this.toast.success(this.i18n.t('Saved the company line of {region} · {bu}', { region, bu: this.scope.buName(bu) }));
        this.scope.load(true);
        this.tick.update((n) => n + 1);
      },
      error: (e) => this.toast.error(e, 'Could not save'),
    });
  }
}
