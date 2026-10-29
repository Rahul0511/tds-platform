import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, firstValueFrom, of, tap } from 'rxjs';
import { I18nService, UiLang } from '../i18n/i18n.service';
import { ScopeRole, User } from '../models';
import { ToastService } from '../toast.service';
import { ALL, can, canAnywhere } from './roles';

/** An account offered by the (demo) Microsoft sign-in. */
export interface SsoAccount {
  username: string;
  display_name: string;
  email: string | null;
}

/**
 * Signal-based auth store. There is no backend: the demo server in
 * src/app/mock-server checks passwords and sessions (see mock-api.interceptor).
 *
 * Rights are roles per region and business unit; the checks here only hide
 * what the user cannot use. The demo server checks every request itself.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private i18n = inject(I18nService);
  private toast = inject(ToastService);

  private readonly _user = signal<User | null>(null);
  readonly user = this._user.asReadonly();
  readonly isSignedIn = computed(() => !!this._user());
  readonly mustChangePassword = computed(() => !!this._user()?.must_change_password);
  /** System administrator. */
  readonly isAdmin = computed(() => !!this._user()?.is_admin);
  /** Editor somewhere. */
  readonly isEditor = computed(() => canAnywhere(this._user(), 'editor'));
  /** BU admin somewhere. */
  readonly isBuAdmin = computed(() => canAnywhere(this._user(), 'bu_admin'));

  /** Runs once at start-up: restores the saved session, if any. */
  restore(): Promise<unknown> {
    return firstValueFrom(
      this.http.get<User>('/api/auth/me').pipe(
        tap((u) => this.setUser(u)),
        catchError(() => of(null)),
      ),
    );
  }

  login(username: string, password: string, remember: boolean) {
    return this.http.post<User>('/api/auth/login', { username, password, remember }).pipe(tap((u) => this.setUser(u)));
  }

  /**
   * Microsoft single sign-on. In this demo the accounts come from the demo
   * data and nobody is redirected; a real version signs in with Microsoft
   * Entra ID and the server maps the Microsoft account to a TDS user.
   */
  ssoAccounts() {
    return this.http.get<SsoAccount[]>('/api/auth/sso/accounts');
  }

  ssoLogin(username: string) {
    return this.http.post<User>('/api/auth/sso', { username }).pipe(tap((u) => this.setUser(u)));
  }

  /** uiLanguage is sent on the first sign-in, where the user chooses the app's language. */
  changePassword(current: string, password: string, uiLanguage?: UiLang) {
    return this.http.post<User>('/api/auth/password', { current, password, ui_language: uiLanguage }).pipe(tap((u) => this.setUser(u)));
  }

  /** Switches the app's language at once and keeps it as the user's setting. */
  setLanguage(lang: UiLang) {
    this.i18n.use(lang);
    if (!this.isSignedIn()) return;
    this.http.put<User>('/api/auth/preferences', { ui_language: lang }).subscribe({
      next: (u) => this._user.set(u),
      error: (e) => this.toast.error(e, 'Could not save the language'),
    });
  }

  logout() {
    this.http.post('/api/auth/logout', {}).subscribe({ complete: () => this.signedOut(), error: () => this.signedOut() });
  }

  /** The role in this region and business unit (or, with '*', in all of them). */
  can(min: ScopeRole, region: string = ALL, bu: string = ALL) {
    return can(this._user(), min, region, bu);
  }

  /** The role in at least one region and business unit. */
  canAnywhere(min: ScopeRole) {
    return canAnywhere(this._user(), min);
  }

  /** Called when the server says the session is gone (401). */
  signedOut(returnUrl?: string) {
    this._user.set(null);
    void this.router.navigate(['/login'], { queryParams: returnUrl && returnUrl !== '/' ? { returnUrl } : {} });
  }

  /** The user's saved language wins; until one is chosen, the current one stays. */
  private setUser(u: User) {
    this._user.set(u);
    if (u.ui_language) this.i18n.use(u.ui_language);
  }
}
