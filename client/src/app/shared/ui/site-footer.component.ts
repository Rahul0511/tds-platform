import { Component } from '@angular/core';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

const SITE = 'https://www.siegwerk.com';

// Same links as the siegwerk.com footer.
const SOCIAL = [
  { label: 'X', href: 'https://x.com/Siegwerk_inks', kind: 'x' },
  { label: 'YouTube', href: 'https://www.youtube.com/user/SiegwerkCC', kind: 'youtube' },
  { label: 'Facebook', href: 'https://www.facebook.com/SiegwerkDruckfarben', kind: 'facebook' },
  { label: 'Instagram', href: 'https://www.instagram.com/siegwerk.global/', kind: 'instagram' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/company/siegwerk/', kind: 'linkedin' },
] as const;

const LEGAL = [
  { label: 'Imprint', href: `${SITE}/en/imprint.html` },
  { label: 'Glossary', href: `${SITE}/en/glossary.html` },
  { label: 'Privacy Policy', href: `${SITE}/en/privacy-policy.html` },
  { label: 'Cookie Declaration', href: `${SITE}/en/cookie-declaration.html` },
  { label: 'Terms and Conditions', href: `${SITE}/en/terms-and-conditions.html` },
];

/** Siegwerk footer (content as on siegwerk.com), styled with the app's design tokens. */
@Component({
  selector: 'app-site-footer',
  imports: [TranslatePipe],
  host: { class: 'no-print block' },
  template: `
    <footer class="border-t border-line bg-surface">
      <div class="mx-auto w-full max-w-[1400px] px-4 pb-24 pt-8 sm:px-6 md:pb-8 lg:px-8">
        <!-- Brand + social -->
        <div class="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <a [href]="site" target="_blank" rel="noopener" class="w-fit rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60" aria-label="Siegwerk – Ink, Heart & Soul">
            <img src="brand/ink-heart-soul.png" alt="Ink, Heart & Soul" class="h-5 w-auto" width="197" height="20" />
          </a>

          <div class="flex flex-wrap items-center gap-x-4 gap-y-3">
            <span class="text-sm text-muted">{{ 'You can also find us here' | t }}</span>
            <ul class="flex items-center gap-1.5" [attr.aria-label]="'Siegwerk on social media' | t">
              @for (s of social; track s.kind) {
                <li>
                  <a
                    [href]="s.href"
                    target="_blank"
                    rel="noopener"
                    class="grid h-9 w-9 place-items-center rounded-lg border border-line text-ink-2 transition hover:border-brand-500/40 hover:bg-brand-500/10 hover:text-brand-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 dark:hover:text-brand-400"
                    [attr.aria-label]="'Siegwerk on {network}' | t: { network: s.label }"
                    [title]="s.label"
                  >
                    <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true">
                      @switch (s.kind) {
                        @case ('x') {
                          <path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.4l-5.8-7.58-6.64 7.58H.47l8.6-9.83L0 1.15h7.6l5.24 6.93zM17.61 20.64h2.04L6.49 3.24H4.3z" />
                        }
                        @case ('youtube') {
                          <path
                            d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81zM9.55 15.57V8.43L15.82 12z"
                          />
                        }
                        @case ('facebook') {
                          <path
                            d="M24 12.04C24 5.4 18.63.04 12 .04S0 5.4 0 12.04c0 5.99 4.39 10.95 10.13 11.85v-8.38H7.08v-3.47h3.05V9.4c0-3.01 1.79-4.67 4.53-4.67 1.31 0 2.69.23 2.69.23v2.95h-1.51c-1.49 0-1.96.93-1.96 1.87v2.25h3.33l-.53 3.47h-2.8v8.38C19.61 22.99 24 18.03 24 12.04z"
                          />
                        }
                        @case ('instagram') {
                          <rect x="2" y="2" width="20" height="20" rx="5.5" fill="none" stroke="currentColor" stroke-width="2.2" />
                          <circle cx="12" cy="12" r="4.4" fill="none" stroke="currentColor" stroke-width="2.2" />
                          <circle cx="17.4" cy="6.6" r="1.3" />
                        }
                        @case ('linkedin') {
                          <path
                            d="M22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0zM7.12 20.45H3.56V9h3.56zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zm15.11 13.02h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46z"
                          />
                        }
                      }
                    </svg>
                  </a>
                </li>
              }
            </ul>
          </div>
        </div>

        <!-- Legal + copyright -->
        <!-- md:pr-16 keeps the links clear of the floating back-to-top button -->
        <div class="mt-6 flex flex-col-reverse gap-4 border-t border-line pt-6 text-sm md:flex-row md:items-center md:justify-between md:pr-16">
          <p class="text-muted">© {{ year }} Siegwerk Druckfarben AG &amp; Co. KGaA</p>
          <nav [attr.aria-label]="'Legal' | t">
            <ul class="flex flex-wrap gap-x-6 gap-y-2">
              @for (l of legal; track l.label) {
                <li>
                  <a [href]="l.href" target="_blank" rel="noopener" class="text-muted transition hover:text-ink">{{ l.label | t }}</a>
                </li>
              }
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  `,
})
export class SiteFooterComponent {
  readonly site = SITE;
  readonly social = SOCIAL;
  readonly legal = LEGAL;
  readonly year = new Date().getFullYear();
}
