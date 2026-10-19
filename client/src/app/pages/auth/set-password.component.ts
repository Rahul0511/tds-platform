import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { I18nService, UI_LANGUAGES, UiLang } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { ToastService } from '../../core/toast.service';
import { IconComponent } from '../../shared/ui/icon.component';
import { PasswordFieldsComponent } from '../../shared/ui/password-fields.component';
import { AuthLayoutComponent } from './auth-layout.component';

/**
 * Shown after signing in with a one-time password from an administrator.
 * The user also picks the app's language here (English unless chosen
 * otherwise); the page switches at once so the choice can be seen.
 */
@Component({
  selector: 'app-set-password',
  imports: [AuthLayoutComponent, PasswordFieldsComponent, IconComponent, TranslatePipe],
  template: `
    <app-auth-layout>
      <span class="grid h-11 w-11 place-items-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
        <app-icon name="key" [size]="22" />
      </span>
      <h1 class="mt-5 text-2xl font-semibold tracking-tight text-ink">{{ 'Welcome! Set up your account' | t }}</h1>
      <p class="mt-1.5 text-sm text-muted">
        {{ 'Hi {name}, you signed in with a one-time password. Choose your language and set your own password to continue.' | t: { name: auth.user()?.display_name } }}
      </p>

      <form class="mt-6" (submit)="$event.preventDefault(); submit()">
        <fieldset>
          <legend class="label">{{ 'Language' | t }}</legend>
          <div class="grid grid-cols-3 gap-2" role="radiogroup">
            @for (l of languages; track l.code) {
              <label
                class="flex cursor-pointer flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-center transition"
                [class]="language() === l.code ? 'border-brand-500 bg-brand-500/5 ring-1 ring-brand-500' : 'border-line hover:bg-surface-2'"
                [attr.lang]="l.code"
              >
                <input type="radio" name="ui_language" class="sr-only" [value]="l.code" [checked]="language() === l.code" (change)="pick(l.code)" />
                <span class="text-xs font-bold uppercase tracking-wider text-muted">{{ l.code }}</span>
                <span class="text-sm font-medium text-ink">{{ l.name }}</span>
              </label>
            }
          </div>
          <p class="hint">{{ 'The app is shown in this language. You can change it later in the user menu.' | t }}</p>
          @if (errors().ui_language; as err) {
            <p class="field-error">{{ err | t }}</p>
          }
        </fieldset>

        <div class="mt-6">
          <app-password-fields
            currentLabel="One-time password"
            [currentError]="errors().current ?? null"
            [newError]="errors().password ?? null"
            (changed)="value.set($event)"
          />
        </div>
        <button type="submit" class="btn-primary mt-6 h-10 w-full" [disabled]="!value() || busy()">
          {{ (busy() ? 'Saving…' : 'Save and continue') | t }}
        </button>
      </form>

      <button type="button" class="btn-ghost mt-3 w-full" (click)="auth.logout()">{{ 'Sign out' | t }}</button>
    </app-auth-layout>
  `,
})
export class SetPasswordComponent {
  readonly auth = inject(AuthService);
  private i18n = inject(I18nService);
  private router = inject(Router);
  private toast = inject(ToastService);

  readonly languages = UI_LANGUAGES;
  /** The current language: one saved earlier (password reset), else English unless switched here. */
  readonly language = computed(() => this.i18n.lang());
  readonly value = signal<{ current: string; password: string } | null>(null);
  readonly busy = signal(false);
  readonly errors = signal<Partial<Record<'current' | 'password' | 'ui_language', string>>>({});

  /** Preview: the page switches straight away; the choice is saved with the password. */
  pick(lang: UiLang) {
    this.i18n.use(lang);
  }

  submit() {
    const v = this.value();
    if (!v) return;
    this.busy.set(true);
    this.auth.changePassword(v.current, v.password, this.language()).subscribe({
      next: () => {
        this.toast.success('Password saved. Welcome!');
        void this.router.navigateByUrl('/');
      },
      error: (e: HttpErrorResponse) => {
        this.busy.set(false);
        this.errors.set(e.error?.fields ?? {});
        if (!e.error?.fields) this.toast.error(e, 'Could not save the password');
      },
    });
  }
}
