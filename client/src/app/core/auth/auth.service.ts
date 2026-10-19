import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, firstValueFrom, of, tap } from 'rxjs';
import { I18nService, UiLang } from '../i18n/i18n.service';
import { Role, User } from '../models';
import { ToastService } from '../toast.service';
import { roleAtLeast } from './roles';

/**
 * Signal-based auth store. The session itself lives in an httpOnly cookie
 * set by the server, so nothing secret is kept in the browser.
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
  readonly isEditor = computed(() => roleAtLeast(this._user()?.role, 'editor'));
  readonly isAdmin = computed(() => roleAtLeast(this._user()?.role, 'admin'));

  /** Runs once at start-up: restores the session from the cookie, if any. */
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

  hasRole(min: Role) {
    return roleAtLeast(this._user()?.role, min);
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
