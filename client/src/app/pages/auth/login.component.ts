import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, input, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { IconComponent } from '../../shared/ui/icon.component';
import { AuthLayoutComponent } from './auth-layout.component';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, AuthLayoutComponent, IconComponent, TranslatePipe],
  template: `
    <app-auth-layout>
      <h1 class="text-2xl font-semibold tracking-tight text-ink">{{ 'Welcome back' | t }}</h1>
      <p class="mt-1.5 text-sm text-muted">{{ 'Sign in to manage and export technical data sheets.' | t }}</p>

      @if (error()) {
        <div class="mt-6 flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-3 text-sm text-red-700 dark:text-red-300" role="alert">
          <app-icon name="alert" [size]="18" class="mt-px" />
          <span>{{ error() | t }}</span>
        </div>
      }

      <form class="mt-6 space-y-4" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div>
          <label class="label" for="username">{{ 'User name' | t }}</label>
          <div class="relative">
            <app-icon name="user" [size]="16" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
            <input id="username" class="input h-10 pl-9" autocomplete="username" autofocus formControlName="username" [placeholder]="'e.g. jdoe' | t" />
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

      <p class="mt-8 text-center text-xs text-muted">{{ 'No account yet? Ask an administrator to create one for you.' | t }}</p>
    </app-auth-layout>
  `,
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly returnUrl = input<string>();
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly showPassword = signal(false);

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
      next: (user) => {
        this.busy.set(false);
        const target = user.must_change_password ? '/set-password' : safeReturnUrl(this.returnUrl());
        void this.router.navigateByUrl(target);
      },
      error: (e: HttpErrorResponse) => {
        this.busy.set(false);
        this.error.set(e.status === 0 ? 'Cannot reach the server.' : (e.error?.error ?? 'Sign-in failed'));
        this.form.controls.password.reset();
      },
    });
  }
}

/** Only allow in-app paths, never another site. */
function safeReturnUrl(url: string | undefined) {
  return url && url.startsWith('/') && !url.startsWith('//') ? url : '/';
}
