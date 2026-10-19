import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { TranslatePipe } from './core/i18n/translate.pipe';
import { clearStaleBuildFlag } from './core/stale-build';
import { ThemeService } from './core/theme.service';
import { ToastService } from './core/toast.service';
import { BackToTopComponent } from './shared/ui/back-to-top.component';
import { DialogHostComponent } from './shared/ui/dialog-host.component';
import { IconComponent } from './shared/ui/icon.component';
import { WatermarkComponent } from './shared/ui/watermark.component';

/** Root: the routed page plus app-wide overlays (prototype watermark, toasts, dialogs). */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, DialogHostComponent, IconComponent, BackToTopComponent, TranslatePipe, WatermarkComponent],
  template: `
    <router-outlet />
    <app-watermark />
    <app-dialog-host />
    <app-back-to-top />

    <div class="no-print pointer-events-none fixed bottom-20 right-5 z-[60] flex w-[22rem] max-w-[calc(100vw-2rem)] flex-col gap-2" aria-live="polite">
      @for (t of toast.toasts(); track t.id) {
        <div class="pointer-events-auto flex animate-pop-in items-start gap-3 rounded-xl border border-line bg-surface p-4 text-sm shadow-pop">
          <span [class]="t.kind === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'">
            <app-icon [name]="t.kind === 'success' ? 'check-circle' : 'alert'" [size]="18" />
          </span>
          <span class="flex-1 text-ink-2">{{ t.text }}</span>
          <button type="button" class="text-subtle hover:text-ink" [attr.aria-label]="'Dismiss' | t" (click)="toast.dismiss(t.id)">
            <app-icon name="x" [size]="16" />
          </button>
        </div>
      }
    </div>
  `,
})
export class AppComponent {
  readonly toast = inject(ToastService);
  // Instantiated here so the saved theme is applied on every page.
  private theme = inject(ThemeService);

  constructor() {
    inject(Router)
      .events.pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => clearStaleBuildFlag());
  }
}
