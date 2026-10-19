import { Component, ElementRef, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { AuthService } from '../core/auth/auth.service';
import { ROLE_INFO } from '../core/auth/roles';
import { I18nService, UI_LANGUAGES } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/translate.pipe';
import { Role } from '../core/models';
import { ThemeMode, ThemeService } from '../core/theme.service';
import { AvatarComponent } from '../shared/ui/avatar.component';
import { IconComponent, IconName } from '../shared/ui/icon.component';
import { SiteFooterComponent } from '../shared/ui/site-footer.component';

interface NavItem {
  path: string;
  label: string;
  icon: IconName;
  exact?: boolean;
  role?: Role;
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
  },
})
export class ShellComponent {
  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);
  readonly i18n = inject(I18nService);
  readonly uiLanguages = UI_LANGUAGES;
  private router = inject(Router);
  private host = inject(ElementRef<HTMLElement>);

  readonly roleInfo = ROLE_INFO;
  readonly menuOpen = signal(false);
  readonly drawerOpen = signal(false);
  readonly collapsed = signal(readCollapsed());

  readonly themes: { mode: ThemeMode; icon: IconName; label: string }[] = [
    { mode: 'light', icon: 'sun', label: 'Light' },
    { mode: 'dark', icon: 'moon', label: 'Dark' },
    { mode: 'system', icon: 'monitor', label: 'System' },
  ];

  private readonly sections: NavSection[] = [
    {
      title: 'Workspace',
      items: [
        { path: '/', label: 'Dashboard', icon: 'home', exact: true },
        { path: '/creator', label: 'TDS Creator', icon: 'file' },
      ],
    },
    {
      title: 'Data',
      items: [
        { path: '/database/products', label: 'Products', icon: 'database' },
        { path: '/database/lookups', label: 'Lookups', icon: 'list', role: 'editor' },
        { path: '/database/texts', label: 'Text & rules', icon: 'type', role: 'editor' },
        { path: '/translations', label: 'Translations', icon: 'globe', role: 'editor' },
        { path: '/history', label: 'Change history', icon: 'history' },
      ],
    },
    {
      title: 'Administration',
      items: [{ path: '/admin/users', label: 'Users & roles', icon: 'shield', role: 'admin' }],
    },
  ];

  readonly nav = computed(() => {
    this.auth.user(); // re-evaluate when the user changes
    return this.sections
      .map((s) => ({ ...s, items: s.items.filter((i) => !i.role || this.auth.hasRole(i.role)) }))
      .filter((s) => s.items.length);
  });

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
