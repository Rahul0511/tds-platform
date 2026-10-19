import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal, viewChild } from '@angular/core';
import { AuthService } from '../core/auth/auth.service';
import { ROLE_INFO } from '../core/auth/roles';
import { I18nService, UI_LANGUAGES } from '../core/i18n/i18n.service';
import { TranslatePipe } from '../core/i18n/translate.pipe';
import { ToastService } from '../core/toast.service';
import { AvatarComponent } from '../shared/ui/avatar.component';
import { IconComponent } from '../shared/ui/icon.component';
import { PasswordFieldsComponent } from '../shared/ui/password-fields.component';

@Component({
  selector: 'app-account',
  imports: [DatePipe, AvatarComponent, IconComponent, PasswordFieldsComponent, TranslatePipe],
  template: `
    <div class="page max-w-4xl">
      <h1 class="page-title">{{ 'Account' | t }}</h1>
      <p class="page-subtitle">{{ 'Your profile, language and password.' | t }}</p>

      @if (auth.user(); as u) {
        <div class="card mt-6 flex flex-wrap items-center gap-5 p-6">
          <app-avatar [name]="u.display_name" [size]="64" />
          <div class="min-w-0 flex-1">
            <div class="text-lg font-semibold text-ink">{{ u.display_name }}</div>
            <div class="text-sm text-muted">&#64;{{ u.username }}{{ u.email ? ' · ' + u.email : '' }}</div>
            <div class="mt-2 flex flex-wrap items-center gap-2">
              <span [class]="roleInfo[u.role].badge">{{ roleInfo[u.role].label | t }}</span>
              <span class="text-xs text-muted">{{ roleInfo[u.role].description | t }}</span>
            </div>
          </div>
          <dl class="text-right text-xs text-muted">
            <dt>{{ 'Member since' | t }}</dt>
            <dd class="text-ink-2">{{ u.created_at | date: 'dd.MM.yyyy' }}</dd>
          </dl>
        </div>

        <section class="card mt-6 p-6">
          <h2 class="card-title flex items-center gap-2"><app-icon name="globe" [size]="16" class="text-brand-600 dark:text-brand-400" /> {{ 'Language' | t }}</h2>
          <p class="mb-4 mt-1 text-sm text-muted">{{ 'Menus, pages and messages are shown in this language. TDS documents keep their own language.' | t }}</p>
          <div class="grid max-w-lg grid-cols-3 gap-2" role="radiogroup" [attr.aria-label]="'Language' | t">
            @for (l of languages; track l.code) {
              <button
                type="button"
                role="radio"
                [attr.aria-checked]="i18n.lang() === l.code"
                [attr.lang]="l.code"
                class="flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 transition"
                [class]="i18n.lang() === l.code ? 'border-brand-500 bg-brand-500/5 ring-1 ring-brand-500' : 'border-line hover:bg-surface-2'"
                (click)="auth.setLanguage(l.code)"
              >
                <span class="text-xs font-bold uppercase tracking-wider text-muted">{{ l.code }}</span>
                <span class="text-sm font-medium text-ink">{{ l.name }}</span>
              </button>
            }
          </div>
        </section>

        <div class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <form class="card p-6" (submit)="$event.preventDefault(); save()">
            <h2 class="card-title">{{ 'Change password' | t }}</h2>
            <p class="mb-5 mt-1 text-sm text-muted">{{ 'Changing it signs you out on all other devices.' | t }}</p>
            <app-password-fields
              #fields
              [currentError]="errors().current ?? null"
              [newError]="errors().password ?? null"
              (changed)="value.set($event)"
            />
            <div class="mt-6 flex justify-end">
              <button type="submit" class="btn-primary" [disabled]="!value() || busy()">{{ (busy() ? 'Saving…' : 'Update password') | t }}</button>
            </div>
          </form>

          <aside class="card h-fit p-5 text-sm">
            <h2 class="card-title flex items-center gap-2"><app-icon name="shield-check" [size]="16" class="text-brand-600 dark:text-brand-400" /> {{ 'Your access' | t }}</h2>
            <ul class="mt-3 space-y-2 text-muted">
              @for (right of roleInfo[u.role].rights; track right) {
                <li class="flex gap-2"><app-icon name="check" [size]="16" class="mt-0.5 text-brand-600 dark:text-brand-400" /> {{ right | t }}</li>
              }
            </ul>
            <p class="mt-4 text-xs text-subtle">{{ 'Need more rights? Ask an administrator.' | t }}</p>
          </aside>
        </div>
      }
    </div>
  `,
})
export class AccountComponent {
  readonly auth = inject(AuthService);
  readonly i18n = inject(I18nService);
  private toast = inject(ToastService);
  readonly roleInfo = ROLE_INFO;
  readonly languages = UI_LANGUAGES;

  readonly value = signal<{ current: string; password: string } | null>(null);
  readonly busy = signal(false);
  readonly errors = signal<Partial<Record<'current' | 'password', string>>>({});
  private fields = viewChild(PasswordFieldsComponent);

  save() {
    const v = this.value();
    if (!v) return;
    this.busy.set(true);
    this.errors.set({});
    this.auth.changePassword(v.current, v.password).subscribe({
      next: () => {
        this.busy.set(false);
        this.toast.success('Password updated');
        const f = this.fields();
        if (f) {
          f.current = '';
          f.next.set('');
          f.repeat.set('');
        }
        this.value.set(null);
      },
      error: (e: HttpErrorResponse) => {
        this.busy.set(false);
        this.errors.set(e.error?.fields ?? {});
        if (!e.error?.fields) this.toast.error(e, 'Could not update the password');
      },
    });
  }
}
