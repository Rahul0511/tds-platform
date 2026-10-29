import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { I18nService, UI_LANGUAGES } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { IconComponent } from '../../shared/ui/icon.component';
import { SiteFooterComponent } from '../../shared/ui/site-footer.component';

/**
 * Sign-in pages, built from the app's floating panels: a top bar with the language switch,
 * the brand panel left and the form card right, then the footer.
 */
@Component({
  selector: 'app-auth-layout',
  imports: [IconComponent, SiteFooterComponent, TranslatePipe],
  template: `
    <div class="flex min-h-screen flex-col">
      <!-- Top bar: floating like the app's header -->
      <div class="px-3 pt-3">
        <header
          class="flex h-14 items-center justify-between gap-3 rounded-[20px] border border-line/70 bg-surface/85 px-4 shadow-[0_18px_40px_-22px_rgb(15_23_42/0.25)] backdrop-blur-md dark:shadow-[0_18px_40px_-22px_rgb(0_0_0/0.7)] sm:px-5"
        >
          <span class="flex items-center gap-2.5 whitespace-nowrap">
            <img src="brand/siegwerk-logo.png" alt="Siegwerk" class="h-6 w-auto dark:hidden" />
            <img src="brand/siegwerk-logo-light.png" alt="Siegwerk" class="hidden h-6 w-auto dark:block" />
            <span class="text-xs font-medium text-muted">{{ 'TDS Platform' | t }}</span>
          </span>
          <div class="flex items-center gap-1 rounded-lg border border-line bg-surface-2 p-0.5 text-xs" role="radiogroup" [attr.aria-label]="'Language' | t">
            <app-icon name="globe" [size]="14" class="mx-1.5 text-subtle" />
            @for (l of languages; track l.code) {
              <button
                type="button"
                role="radio"
                [attr.aria-checked]="i18n.lang() === l.code"
                [attr.lang]="l.code"
                [title]="l.name"
                class="rounded-md px-2 py-1 font-semibold uppercase transition"
                [class]="i18n.lang() === l.code ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'"
                (click)="auth.setLanguage(l.code)"
              >
                {{ l.code }}
              </button>
            }
          </div>
        </header>
      </div>

      <div class="grid flex-1 gap-3 px-3 pt-3 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <!-- Brand panel: shaped like the sidebar -->
        <section
          class="relative hidden overflow-hidden rounded-[26px] border border-white/5 bg-[#111113] shadow-[0_18px_40px_-18px_rgb(15_23_42/0.25)] dark:shadow-[0_18px_40px_-18px_rgb(0_0_0/0.7)] lg:flex lg:flex-col lg:justify-between lg:p-12"
        >
          <div class="pointer-events-none absolute inset-0" aria-hidden="true">
            <div class="absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-brand-600/35 blur-3xl"></div>
            <div class="absolute -bottom-40 right-0 h-[30rem] w-[30rem] rounded-full bg-brand-800/30 blur-3xl"></div>
            <div class="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:22px_22px]"></div>
          </div>

          <div class="relative text-[10px] font-semibold uppercase tracking-[0.1em] text-white/50">{{ 'TDS Platform' | t }}</div>

          <div class="relative max-w-lg">
            <h1 class="text-4xl font-semibold leading-tight tracking-tight text-white">{{ 'One place to write, keep and publish technical data sheets.' | t }}</h1>
            <p class="mt-4 text-white/70">
              {{ 'Product data, wording and layout live in one database. Every TDS is generated from it, versioned and traceable.' | t }}
            </p>

            <!-- Mini TDS card -->
            <div class="mt-10 rounded-2xl bg-white/[0.06] p-5 ring-1 ring-white/10 backdrop-blur">
              <div class="flex items-center justify-between text-xs text-white/60">
                <span class="font-semibold uppercase tracking-wider">{{ 'Technical data sheet' | t }}</span>
                <span>v1 · EN</span>
              </div>
              <div class="mt-2 font-semibold text-white">TEST GLOSS VARNISH (DEMO)</div>
              <div class="mt-4 space-y-2">
                @for (r of ratings; track r.label) {
                  <div class="flex items-center justify-between gap-4 text-sm">
                    <span class="text-white/70">{{ r.label | t }}</span>
                    <span class="flex gap-1">
                      @for (p of dots; track p) {
                        <span class="h-2 w-2 rounded-full" [class]="p <= r.value ? 'bg-brand-500' : 'bg-white/15'"></span>
                      }
                    </span>
                  </div>
                }
              </div>
            </div>
          </div>

          <ul class="relative flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/60">
            <li class="flex items-center gap-2"><app-icon name="check-circle" [size]="16" class="text-brand-400" /> {{ 'Version history' | t }}</li>
            <li class="flex items-center gap-2"><app-icon name="check-circle" [size]="16" class="text-brand-400" /> {{ 'Role-based access' | t }}</li>
            <li class="flex items-center gap-2"><app-icon name="check-circle" [size]="16" class="text-brand-400" /> {{ 'One-page PDF export' | t }}</li>
          </ul>
        </section>

        <!-- Form: a floating card like the sidebar -->
        <section
          class="flex flex-col justify-center rounded-[26px] border border-line/70 bg-surface px-6 py-12 shadow-[0_18px_40px_-18px_rgb(15_23_42/0.25)] dark:shadow-[0_18px_40px_-18px_rgb(0_0_0/0.7)] sm:px-12"
        >
          <div class="mx-auto w-full max-w-sm animate-pop-in">
            <ng-content />
          </div>
        </section>
      </div>

      <app-site-footer />
    </div>
  `,
})
export class AuthLayoutComponent {
  readonly auth = inject(AuthService);
  readonly i18n = inject(I18nService);
  readonly languages = UI_LANGUAGES;
  readonly dots = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  readonly ratings = [
    { label: 'Gloss', value: 6 },
    { label: 'Rub Resistance', value: 7 },
    { label: 'Drying', value: 5 },
  ];
}
