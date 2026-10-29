import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { AuthService } from './auth/auth.service';
import { ALL } from './auth/roles';
import { Org, OrgUnit } from './models';

const KEY = 'tds.workspace';

function readStored(): { region: string; bu: string } {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return { region: typeof v.region === 'string' ? v.region : '', bu: typeof v.bu === 'string' ? v.bu : '' };
  } catch {
    return { region: '', bu: '' };
  }
}

/**
 * The workspace: which region and business unit the lists show (empty = all
 * the user may see), plus the regions and business units themselves. Picked
 * in the top bar and remembered in this browser.
 */
@Injectable({ providedIn: 'root' })
export class ScopeService {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  readonly org = signal<Org | null>(null);
  readonly region = signal(readStored().region);
  readonly bu = signal(readStored().bu);

  /** Regions the user has access to (all of them for '*' and system admins). */
  readonly regions = computed(() => this.visible(this.org()?.regions ?? [], 'region_code'));
  readonly businessUnits = computed(() => this.visible(this.org()?.businessUnits ?? [], 'bu_code'));

  readonly filter = computed(() => ({ region: this.region(), bu: this.bu() }));

  constructor() {
    effect(() => {
      const value = JSON.stringify({ region: this.region(), bu: this.bu() });
      try {
        localStorage.setItem(KEY, value);
      } catch {
        /* not remembered */
      }
    });
    // A remembered choice the user no longer has access to falls back to "all".
    effect(() => {
      if (!this.org()) return;
      if (this.region() && !this.regions().some((r) => r.code === this.region())) this.region.set('');
      if (this.bu() && !this.businessUnits().some((b) => b.code === this.bu())) this.bu.set('');
    });
  }

  load(force = false) {
    if (this.org() && !force) return;
    this.api.org().subscribe({ next: (o) => this.org.set(o), error: () => {} });
  }

  regionName(code: string | null | undefined) {
    if (!code || code === ALL) return '';
    return this.org()?.regions.find((r) => r.code === code)?.name ?? code;
  }

  buName(code: string | null | undefined) {
    if (!code || code === ALL) return '';
    return this.org()?.businessUnits.find((b) => b.code === code)?.name ?? code;
  }

  /** Company line of a region and business unit ('' = the template's default). */
  companyLine(region: string, bu: string) {
    return this.org()?.settings.find((s) => s.region_code === region && s.bu_code === bu && s.key === 'company_line')?.value ?? '';
  }

  private visible(units: OrgUnit[], key: 'region_code' | 'bu_code') {
    const user = this.auth.user();
    if (!user) return [];
    const active = units.filter((u) => u.active);
    if (user.is_admin || user.access.some((a) => a[key] === ALL)) return active;
    const codes = new Set(user.access.map((a) => a[key]));
    return active.filter((u) => codes.has(u.code));
  }
}
