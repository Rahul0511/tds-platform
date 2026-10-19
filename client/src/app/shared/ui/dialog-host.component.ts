import { Component, ElementRef, effect, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogService } from '../../core/dialog.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { IconComponent } from './icon.component';

/** Renders the confirm / prompt dialogs opened through DialogService. */
@Component({
  selector: 'app-dialog-host',
  imports: [FormsModule, IconComponent, TranslatePipe],
  template: `
    @if (dialogs.current(); as d) {
      <div class="fixed inset-0 z-50 grid place-items-center p-4" (keydown.escape)="dialogs.close(null)">
        <div class="absolute inset-0 animate-fade-in bg-slate-950/50 backdrop-blur-[2px]" (click)="dialogs.close(null)"></div>
        <form
          #panel
          role="dialog"
          aria-modal="true"
          [attr.aria-labelledby]="'dlg-title'"
          class="relative w-full max-w-md animate-pop-in rounded-2xl border border-line bg-surface p-6 shadow-pop"
          (ngSubmit)="submit()"
        >
          <div class="flex gap-4">
            <span
              class="grid h-10 w-10 shrink-0 place-items-center rounded-full"
              [class]="d.tone === 'danger' ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-brand-500/10 text-brand-600 dark:text-brand-400'"
            >
              <app-icon [name]="d.tone === 'danger' ? 'alert' : 'info'" [size]="20" />
            </span>
            <div class="min-w-0 flex-1">
              <h2 id="dlg-title" class="text-base font-semibold text-ink">{{ d.title | t }}</h2>
              @if (d.message) {
                <p class="mt-1.5 whitespace-pre-line text-sm text-muted">{{ d.message | t }}</p>
              }
              @if (d.input; as field) {
                <label class="label mt-4" for="dlg-input">{{ field.label | t }}</label>
                @if (field.multiline) {
                  <textarea #inputEl id="dlg-input" name="value" rows="3" class="input" [placeholder]="field.placeholder ?? '' | t" [(ngModel)]="value"></textarea>
                } @else {
                  <input #inputEl id="dlg-input" name="value" class="input" [placeholder]="field.placeholder ?? '' | t" [(ngModel)]="value" />
                }
              }
            </div>
          </div>
          <div class="mt-6 flex justify-end gap-2">
            <button type="button" class="btn-secondary" (click)="dialogs.close(null)">{{ d.cancelText ?? 'Cancel' | t }}</button>
            <button
              #confirmBtn
              type="submit"
              [class]="d.tone === 'danger' ? 'btn-danger' : 'btn-primary'"
              [disabled]="d.input?.required && !value.trim()"
            >
              {{ d.confirmText ?? 'OK' | t }}
            </button>
          </div>
        </form>
      </div>
    }
  `,
})
export class DialogHostComponent {
  readonly dialogs = inject(DialogService);
  value = '';

  private inputEl = viewChild<ElementRef<HTMLElement>>('inputEl');
  private confirmBtn = viewChild<ElementRef<HTMLElement>>('confirmBtn');
  private lastFocus = signal<HTMLElement | null>(null);

  constructor() {
    effect(() => {
      const open = this.dialogs.current();
      if (open) {
        this.value = '';
        this.lastFocus.set(document.activeElement as HTMLElement | null);
        // Focus the field (or the confirm button) once the dialog is in the DOM.
        queueMicrotask(() => (this.inputEl() ?? this.confirmBtn())?.nativeElement.focus());
      } else {
        this.lastFocus()?.focus?.();
      }
    });
  }

  submit() {
    const d = this.dialogs.current();
    if (!d) return;
    if (d.input) {
      if (d.input.required && !this.value.trim()) return;
      this.dialogs.close(this.value.trim());
    } else {
      this.dialogs.close(true);
    }
  }
}
