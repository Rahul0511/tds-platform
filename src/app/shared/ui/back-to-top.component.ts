import { Component, signal } from '@angular/core';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { IconComponent } from './icon.component';

/** Round "back to top" button, as on siegwerk.com. Appears after scrolling down. */
@Component({
  selector: 'app-back-to-top',
  imports: [IconComponent, TranslatePipe],
  host: { '(window:scroll)': 'onScroll()' },
  template: `
    @if (visible()) {
      <button
        type="button"
        class="no-print fixed bottom-5 right-5 z-40 grid h-[50px] w-[50px] animate-pop-in place-items-center rounded-full bg-neutral-950 text-white shadow-pop transition hover:-translate-y-0.5 hover:bg-brand-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:bg-white dark:text-neutral-950 dark:hover:bg-brand-500 dark:hover:text-white"
        [attr.aria-label]="'Back to top' | t"
        (click)="toTop()"
      >
        <app-icon name="chevron-down" [size]="22" [stroke]="2.6" class="rotate-180" />
      </button>
    }
  `,
})
export class BackToTopComponent {
  readonly visible = signal(false);

  onScroll() {
    this.visible.set(window.scrollY > 200);
  }

  toTop() {
    scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
}
