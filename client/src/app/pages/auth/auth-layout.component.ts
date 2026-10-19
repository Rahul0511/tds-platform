import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { I18nService, UI_LANGUAGES } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { IconComponent } from '../../shared/ui/icon.component';
import { SiteFooterComponent } from '../../shared/ui/site-footer.component';

/** Split screen used by the sign-in pages: brand panel left, form right, language switch on top. */
@Component({
  selector: 'app-auth-layout',
  imports: [IconComponent, SiteFooterComponent, TranslatePipe],
  template: `
    <div class="grid min-h-screen lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <!-- Brand panel -->
      <section class="relative hidden overflow-hidden bg-[#111113] lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div class="pointer-events-none absolute inset-0" aria-hidden="true">
          <div class="absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-brand-600/35 blur-3xl"></div>
          <div class="absolute -bottom-40 right-0 h-[30rem] w-[30rem] rounded-full bg-brand-800/30 blur-3xl"></div>
          <div class="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:22px_22px]"></div>
        </div>

        <div class="relative flex items-end gap-4">
          <img src="brand/siegwerk-logo-light.png" alt="Siegwerk" class="h-9 w-auto" />
          <span class="mb-0.5 border-l border-white/20 pl-4 text-sm leading-tight text-white/70">{{ 'TDS Platform' | t }}<br />Global Sheetfed</span>
        </div>

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

      <!-- Form -->
      <section class="relative flex flex-col justify-center px-6 py-12 sm:px-12">
        <div class="absolute right-4 top-4 flex rounded-lg border border-line bg-surface-2 p-0.5 text-xs sm:right-6 sm:top-6" role="radiogroup" [attr.aria-label]="'Language' | t">
          <app-icon name="globe" [size]="14" class="mx-1.5 self-center text-subtle" />
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
        <div class="mx-auto w-full max-w-sm animate-pop-in">
          <div class="mb-10 lg:hidden">
            <img src="brand/siegwerk-logo.png" alt="Siegwerk" class="h-8 w-auto dark:hidden" />
            <img src="brand/siegwerk-logo-light.png" alt="Siegwerk" class="hidden h-8 w-auto dark:block" />
            <div class="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">{{ 'TDS Platform' | t }}</div>
          </div>
          <ng-content />
        </div>
      </section>
    </div>
    <app-site-footer />
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
