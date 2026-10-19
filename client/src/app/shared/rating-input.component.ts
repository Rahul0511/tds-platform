import { Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { TranslatePipe } from '../core/i18n/translate.pipe';

/** 1..max dot picker for the rating scales. Empty = n.a. */
@Component({
  selector: 'app-rating-input',
  imports: [TranslatePipe],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => RatingInputComponent), multi: true }],
  template: `
    <div class="flex items-center gap-3" role="radiogroup" [attr.aria-label]="label() | t">
      <div class="flex gap-1">
        @for (p of positions; track p) {
          <button
            type="button"
            role="radio"
            [attr.aria-checked]="value() === p"
            [attr.aria-label]="p"
            [disabled]="disabled()"
            (click)="set(p)"
            class="h-5 w-5 rounded-full border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 hover:scale-110"
            [class]="value() !== null && p <= value()! ? 'border-brand-600 bg-brand-600' : 'border-line-strong bg-surface-2 hover:bg-brand-500/20'"
          ></button>
        }
      </div>
      <span class="w-8 text-sm font-medium tabular-nums text-ink-2">{{ value() ?? '–' }}</span>
      <button type="button" class="rounded-md px-1.5 py-0.5 text-xs text-muted hover:bg-surface-2 hover:text-ink" [disabled]="disabled()" (click)="set(null)">
        {{ 'n.a.' | t }}
      </button>
    </div>
  `,
})
export class RatingInputComponent implements ControlValueAccessor {
  readonly max = input(10);
  readonly label = input('');

  readonly value = signal<number | null>(null);
  readonly disabled = signal(false);

  private onChange: (v: number | null) => void = () => {};
  private onTouched: () => void = () => {};

  get positions() {
    return Array.from({ length: this.max() }, (_, i) => i + 1);
  }

  set(v: number | null) {
    this.value.set(v);
    this.onChange(v);
    this.onTouched();
  }

  writeValue(v: number | null): void {
    this.value.set(v ?? null);
  }
  registerOnChange(fn: (v: number | null) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(d: boolean): void {
    this.disabled.set(d);
  }
}
