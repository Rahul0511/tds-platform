import { Component, ElementRef, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { AuthService } from '../core/auth/auth.service';
import { ROLE_INFO, SYSTEM_ADMIN_INFO, topRole } from '../core/auth/roles';
import { I18nService, UI_LANGUAGES } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/translate.pipe';
import { ScopeRole } from '../core/models';
import { ScopeService } from '../core/scope.service';
import { ThemeMode, ThemeService } from '../core/theme.service';
import { AvatarComponent } from '../shared/ui/avatar.component';
import { IconComponent, IconName } from '../shared/ui/icon.component';
import { SiteFooterComponent } from '../shared/ui/site-footer.component';

interface NavItem {
  path: string;
  label: string;
  icon: IconName;
  exact?: boolean;
  /** Needed somewhere: a role in some region and business unit, or 'admin' (system admin). */
  role?: ScopeRole | 'admin';
  /** A group: opens to show these pages (as a flyout when the sidebar is collapsed). */
  children?: NavItem[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const COLLAPSED_KEY = 'tds.sidebarCollapsed';

/** Signed-in layout: sidebar, top bar with breadcrumbs and user menu. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent, AvatarComponent, SiteFooterComponent, TranslatePipe],
  templateUrl: './shell.component.html',
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'menuOpen.set(false); drawerOpen.set(false)',
    '(window:scroll)': 'onScroll()',
  },
})
export class ShellComponent {
  private router = inject(Router);
  private host = inject(ElementRef<HTMLElement>);
  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);
  readonly i18n = inject(I18nService);
  readonly scope = inject(ScopeService);
  readonly uiLanguages = UI_LANGUAGES;

  /** Shown under the user's name: system admin, or the highest role they have. */
  readonly roleBadge = computed(() => {
    const u = this.auth.user();
    if (u?.is_admin) return SYSTEM_ADMIN_INFO;
    const r = topRole(u);
    return r ? ROLE_INFO[r] : null;
  });
  readonly menuOpen = signal(false);
  readonly drawerOpen = signal(false);
  readonly collapsed = signal(readCollapsed());
  /** The top bar slides away while scrolling down and comes back on any scroll up. */
  readonly headerHidden = signal(false);
  private lastScrollY = 0;

  onScroll(): void {
    const y = Math.max(window.scrollY, 0);
    const delta = y - this.lastScrollY;
    // Ignore small jitters (trackpads, overscroll bounce)
    if (Math.abs(delta) < 6) return;
    // Near the top, or with the user menu open, it always shows
    this.headerHidden.set(delta > 0 && y > 80 && !this.menuOpen());
    this.lastScrollY = y;
  }

  readonly themes: { mode: ThemeMode; icon: IconName; label: string }[] = [
    { mode: 'light', icon: 'sun', label: 'Light' },
    { mode: 'dark', icon: 'moon', label: 'Dark' },
    { mode: 'system', icon: 'monitor', label: 'System' },
  ];

  private readonly sections: NavSection[] = [
    {
      title: 'Main',
      items: [
        { path: '/', label: 'Dashboard', icon: 'home', exact: true },
        { path: '/creator', label: 'TDS Creator', icon: 'file' },
        {
          path: '/database',
          label: 'Product data',
          icon: 'database',
          children: [
            { path: '/database/products', label: 'Products', icon: 'database' },
            { path: '/templates', label: 'Templates', icon: 'layers' },
            { path: '/database/lookups', label: 'Lookups', icon: 'list', role: 'editor' },
            { path: '/translations', label: 'Translations', icon: 'globe', role: 'editor' },
            { path: '/history', label: 'Change history', icon: 'history' },
          ],
        },
      ],
    },
    {
      title: 'Administration',
      items: [
        { path: '/admin/organisation', label: 'Organisation', icon: 'sliders', role: 'bu_admin' },
        { path: '/admin/users', label: 'Users & roles', icon: 'shield', role: 'admin' },
      ],
    },
  ];

  /** Groups the user opened; the group of the current page is always open. */
  readonly openGroups = signal<Set<string>>(new Set());
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url),
    ),
    { initialValue: '' },
  );

  /** A group is "active" when one of its pages is shown. */
  groupActive(item: NavItem) {
    const url = this.url().split('?')[0];
    return !!item.children?.some((c) => url === c.path || url.startsWith(c.path + '/'));
  }

  groupOpen(item: NavItem) {
    return this.openGroups().has(item.path) || this.groupActive(item);
  }

  toggleGroup(item: NavItem) {
    this.openGroups.update((s) => {
      const next = new Set(s);
      if (next.has(item.path) || this.groupActive(item)) next.delete(item.path);
      else next.add(item.path);
      return next;
    });
  }

  readonly nav = computed(() => {
    this.auth.user(); // re-evaluate when the user changes
    return this.sections
      .map((s) => ({
        ...s,
        items: s.items
          .map((i) => (i.children ? { ...i, children: i.children.filter((c) => this.allowed(c)) } : i))
          .filter((i) => this.allowed(i) && (!i.children || i.children.length)),
      }))
      .filter((s) => s.items.length);
  });

  private allowed(i: NavItem) {
    return !i.role || (i.role === 'admin' ? this.auth.isAdmin() : this.auth.canAnywhere(i.role));
  }

  /** Breadcrumbs from the `crumb` data of the active routes. */
  readonly crumbs = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      startWith(null),
      map(() => collectCrumbs(this.router.routerState.snapshot.root)),
    ),
    { initialValue: [] as string[] },
  );

  constructor() {
    this.scope.load();
    effect(() => {
      try {
        localStorage.setItem(COLLAPSED_KEY, String(this.collapsed()));
      } catch {
        /* not persisted */
      }
    });
    // Close the mobile drawer after navigating.
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => this.drawerOpen.set(false));
  }

  onDocumentClick(e: MouseEvent) {
    const menu = this.host.nativeElement.querySelector('[data-user-menu]');
    if (this.menuOpen() && menu && !menu.contains(e.target as Node)) this.menuOpen.set(false);
  }
}

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
}

function collectCrumbs(route: ActivatedRouteSnapshot): string[] {
  const out: string[] = [];
  for (let r: ActivatedRouteSnapshot | null = route; r; r = r.firstChild) {
    const c = r.routeConfig?.data?.['crumb'];
    if (c && out[out.length - 1] !== c) out.push(c);
  }
  return out;
}
