import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, input, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, SsoAccount } from '../../core/auth/auth.service';
import { DialogService } from '../../core/dialog.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { resetDemoData } from '../../mock-server/api.js';
import { IconComponent } from '../../shared/ui/icon.component';
import { AuthLayoutComponent } from './auth-layout.component';

/** Demo accounts shown under the form; every one has the password "demo" (see mock-server/seed-demo.js). */
const DEMO_ACCOUNTS = [
  { username: 'admin', role: 'System admin' },
  { username: 'nw.admin', role: 'BU admin · Narrow Web' },
  { username: 'editor', role: 'Editor · EMEA' },
  { username: 'sf.editor', role: 'Editor · EMEA Sheetfed' },
  { username: 'viewer', role: 'Viewer · everywhere' },
  { username: 'new.user', role: 'First sign-in' },
];

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, AuthLayoutComponent, IconComponent, TranslatePipe],
  template: `
    <app-auth-layout>
      @if (picker()) {
        <!-- ===== Demo Microsoft sign-in: pick an account ===== -->
        <button type="button" class="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink" (click)="closePicker()">
          <app-icon name="arrow-left" [size]="14" /> {{ 'Back' | t }}
        </button>
        <div class="mt-4 flex items-center gap-3">
          <span class="grid h-10 w-10 place-items-center rounded-lg border border-line bg-surface">
            <svg width="20" height="20" viewBox="0 0 21 21" aria-hidden="true"><rect x="1" y="1" width="9" height="9" fill="#f25022" /><rect x="11" y="1" width="9" height="9" fill="#7fba00" /><rect x="1" y="11" width="9" height="9" fill="#00a4ef" /><rect x="11" y="11" width="9" height="9" fill="#ffb900" /></svg>
          </span>
          <div>
            <h1 class="text-xl font-semibold tracking-tight text-ink">{{ 'Pick an account' | t }}</h1>
            <p class="text-sm text-muted">{{ 'to continue to the TDS Platform' | t }}</p>
          </div>
        </div>

        @if (error()) {
          <div class="mt-5 flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-3 text-sm text-red-700 dark:text-red-300" role="alert">
            <app-icon name="alert" [size]="18" class="mt-px" />
            <span>{{ error() | t }}</span>
          </div>
        }

        <ul class="mt-5 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
          @for (a of accounts(); track a.username) {
            <li>
              <button
                type="button"
                class="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-surface-2 disabled:opacity-60"
                [disabled]="busy()"
                (click)="sso(a)"
              >
                <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-2 text-xs font-semibold text-ink-2">{{ initials(a.display_name) }}</span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-medium text-ink">{{ a.display_name }}</span>
                  <span class="block truncate text-xs text-muted">{{ a.email ?? a.username }}</span>
                </span>
                @if (busy() && pending() === a.username) {
                  <span class="h-4 w-4 animate-spin rounded-full border-2 border-line-strong border-t-brand-600"></span>
                }
              </button>
            </li>
          } @empty {
            <li class="px-4 py-6 text-center text-sm text-muted">{{ 'Loading…' | t }}</li>
          }
        </ul>
        <p class="mt-4 flex items-start gap-2 text-xs text-muted">
          <app-icon name="info" [size]="14" class="mt-px shrink-0" />
          <span>{{ 'Demo single sign-on: no password is asked. In production this button sends you to Microsoft to sign in with your company account.' | t }}</span>
        </p>
      } @else {
        <!-- ===== Sign-in ===== -->
        <h1 class="text-2xl font-semibold tracking-tight text-ink">{{ 'Welcome back' | t }}</h1>
        <p class="mt-1.5 text-sm text-muted">{{ 'Sign in to manage and export technical data sheets.' | t }}</p>

        @if (error()) {
          <div class="mt-6 flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-3 text-sm text-red-700 dark:text-red-300" role="alert">
            <app-icon name="alert" [size]="18" class="mt-px" />
            <span>{{ error() | t }}</span>
          </div>
        }

        <button type="button" class="btn-secondary mt-6 h-10 w-full" [disabled]="busy()" (click)="openPicker()">
          <svg width="18" height="18" viewBox="0 0 21 21" aria-hidden="true"><rect x="1" y="1" width="9" height="9" fill="#f25022" /><rect x="11" y="1" width="9" height="9" fill="#7fba00" /><rect x="1" y="11" width="9" height="9" fill="#00a4ef" /><rect x="11" y="11" width="9" height="9" fill="#ffb900" /></svg>
          {{ 'Sign in with Microsoft' | t }}
        </button>

        <div class="my-6 flex items-center gap-3 text-xs text-muted">
          <span class="h-px flex-1 bg-line"></span>
          {{ 'or with your user name' | t }}
          <span class="h-px flex-1 bg-line"></span>
        </div>

        <form class="space-y-4" [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div>
            <label class="label" for="username">{{ 'User name' | t }}</label>
            <div class="relative">
              <app-icon name="user" [size]="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
              <input id="username" class="input h-10 pl-9" autocomplete="username" formControlName="username" [placeholder]="'e.g. jdoe' | t" />
            </div>
          </div>

          <div>
            <label class="label" for="password">{{ 'Password' | t }}</label>
            <div class="relative">
              <app-icon name="lock" [size]="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
              <input
                id="password"
                class="input h-10 pl-9 pr-10"
                [type]="showPassword() ? 'text' : 'password'"
                autocomplete="current-password"
                formControlName="password"
                placeholder="••••••••••"
              />
              <button
                type="button"
                class="absolute right-1.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-subtle hover:bg-surface-2 hover:text-ink"
                [attr.aria-label]="(showPassword() ? 'Hide password' : 'Show password') | t"
                (click)="showPassword.set(!showPassword())"
              >
                <app-icon [name]="showPassword() ? 'eye-off' : 'eye'" [size]="16" />
              </button>
            </div>
          </div>

          <label class="flex items-center gap-2 text-sm text-ink-2">
            <input type="checkbox" class="checkbox" formControlName="remember" />
            {{ 'Keep me signed in for 14 days' | t }}
          </label>

          <button type="submit" class="btn-primary h-10 w-full" [disabled]="busy() || form.invalid">
            @if (busy()) {
              <span class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></span> {{ 'Signing in…' | t }}
            } @else {
              {{ 'Sign in' | t }} <app-icon name="arrow-right" [size]="16" />
            }
          </button>
        </form>

        <!-- Demo accounts: there is no backend, the data lives in this browser. -->
        <details class="group mt-8 rounded-lg border border-line bg-surface-2/60 text-sm">
          <summary class="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 font-medium text-ink-2">
            <app-icon name="info" [size]="15" class="text-subtle" />
            {{ 'Demo accounts' | t }}
            <span class="ml-auto text-xs font-normal text-muted">{{ 'password: demo' | t }}</span>
            <app-icon name="chevron-down" [size]="14" class="text-subtle transition group-open:rotate-180" />
          </summary>
          <ul class="border-t border-line px-2 py-1.5">
            @for (a of demoAccounts; track a.username) {
              <li>
                <button type="button" class="flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left hover:bg-surface" (click)="fill(a.username)">
                  <span class="font-mono text-xs text-ink">{{ a.username }}</span>
                  <span class="text-xs text-muted">{{ a.role | t }}</span>
                </button>
              </li>
            }
          </ul>
          <div class="flex items-center justify-between gap-3 border-t border-line px-4 py-2.5 text-xs text-muted">
            <span>{{ 'Demo data is kept in this browser.' | t }}</span>
            <button type="button" class="font-medium text-brand-600 hover:underline dark:text-brand-400" (click)="reset()">{{ 'Reset demo data' | t }}</button>
          </div>
        </details>
      }
    </app-auth-layout>
  `,
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private dialog = inject(DialogService);

  readonly returnUrl = input<string>();
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly showPassword = signal(false);

  readonly picker = signal(false);
  readonly accounts = signal<SsoAccount[]>([]);
  readonly pending = signal<string | null>(null);
  readonly demoAccounts = DEMO_ACCOUNTS;

  readonly form = new FormGroup({
    username: new FormControl('', { nonNullable: true, validators: Validators.required }),
    password: new FormControl('', { nonNullable: true, validators: Validators.required }),
    remember: new FormControl(false, { nonNullable: true }),
  });

  submit() {
    if (this.form.invalid) return;
    const { username, password, remember } = this.form.getRawValue();
    this.busy.set(true);
    this.error.set(null);
    this.auth.login(username.trim(), password, remember).subscribe({
      next: (user) => this.signedIn(user.must_change_password),
      error: (e: HttpErrorResponse) => {
        this.busy.set(false);
        this.error.set(e.error?.error ?? 'Sign-in failed');
        this.form.controls.password.reset();
      },
    });
  }

  fill(username: string) {
    this.form.setValue({ username, password: 'demo', remember: this.form.controls.remember.value });
    this.error.set(null);
  }

  openPicker() {
    this.error.set(null);
    this.picker.set(true);
    this.auth.ssoAccounts().subscribe({ next: (list) => this.accounts.set(list), error: () => this.error.set('Sign-in failed') });
  }

  closePicker() {
    this.picker.set(false);
    this.error.set(null);
  }

  /** Demo single sign-on: a short pause where a real sign-in would go to Microsoft and back. */
  sso(a: SsoAccount) {
    this.busy.set(true);
    this.pending.set(a.username);
    this.error.set(null);
    setTimeout(() => {
      this.auth.ssoLogin(a.username).subscribe({
        next: (user) => this.signedIn(user.must_change_password),
        error: (e: HttpErrorResponse) => {
          this.busy.set(false);
          this.pending.set(null);
          this.error.set(e.error?.error ?? 'Sign-in failed');
        },
      });
    }, 700);
  }

  async reset() {
    const ok = await this.dialog.confirm({
      title: 'Reset demo data?',
      message: 'Products, users, translations and history go back to the demo data. Everything changed in this browser is lost.',
      confirmText: 'Reset demo data',
      tone: 'danger',
    });
    if (!ok) return;
    resetDemoData();
    location.reload();
  }

  initials(name: string) {
    return name
      .split(/\s+/)
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  private signedIn(mustChangePassword: boolean) {
    this.busy.set(false);
    const target = mustChangePassword ? '/set-password' : safeReturnUrl(this.returnUrl());
    void this.router.navigateByUrl(target);
  }
}

/** Only allow in-app paths, never another site. */
function safeReturnUrl(url: string | undefined) {
  return url && url.startsWith('/') && !url.startsWith('//') ? url : '/';
}
