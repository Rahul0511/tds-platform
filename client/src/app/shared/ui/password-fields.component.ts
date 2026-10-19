import { Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { IconComponent } from './icon.component';

export const MIN_PASSWORD_LENGTH = 10;

/** Current + new + repeat password, with a strength meter. Emits when valid. */
@Component({
  selector: 'app-password-fields',
  imports: [FormsModule, IconComponent, TranslatePipe],
  template: `
    <div class="space-y-4">
      <div>
        <label class="label" for="pw-current">{{ currentLabel() | t }}</label>
        <input id="pw-current" type="password" class="input h-10" autocomplete="current-password" [(ngModel)]="current" (ngModelChange)="emit()" />
        @if (currentError()) {
          <p class="field-error">{{ currentError() | t }}</p>
        }
      </div>

      <div>
        <label class="label" for="pw-new">{{ 'New password' | t }}</label>
        <div class="relative">
          <input
            id="pw-new"
            class="input h-10 pr-10"
            [type]="show() ? 'text' : 'password'"
            autocomplete="new-password"
            [ngModel]="next()"
            (ngModelChange)="next.set($event); emit()"
          />
          <button
            type="button"
            class="absolute right-1.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-subtle hover:bg-surface-2 hover:text-ink"
            [attr.aria-label]="(show() ? 'Hide password' : 'Show password') | t"
            (click)="show.set(!show())"
          >
            <app-icon [name]="show() ? 'eye-off' : 'eye'" [size]="16" />
          </button>
        </div>
        <div class="mt-2 flex gap-1" aria-hidden="true">
          @for (i of [0, 1, 2, 3]; track i) {
            <span class="h-1 flex-1 rounded-full transition-colors" [class]="i < strength().score ? strength().color : 'bg-surface-2'"></span>
          }
        </div>
        <p class="hint">
          {{ strength().label | t }} · {{ 'at least {n} characters. A short sentence or several words is easy to remember and hard to guess.' | t: { n: min } }}
        </p>
        @if (newError()) {
          <p class="field-error">{{ newError() | t }}</p>
        }
      </div>

      <div>
        <label class="label" for="pw-repeat">{{ 'Repeat new password' | t }}</label>
        <input
          id="pw-repeat"
          type="password"
          class="input h-10"
          autocomplete="new-password"
          [class.input-error]="mismatch()"
          [ngModel]="repeat()"
          (ngModelChange)="repeat.set($event); emit()"
        />
        @if (mismatch()) {
          <p class="field-error">{{ 'The passwords do not match.' | t }}</p>
        }
      </div>
    </div>
  `,
})
export class PasswordFieldsComponent {
  readonly currentLabel = input('Current password');
  readonly currentError = input<string | null>(null);
  readonly newError = input<string | null>(null);
  readonly changed = output<{ current: string; password: string } | null>();

  readonly min = MIN_PASSWORD_LENGTH;
  current = '';
  readonly next = signal('');
  readonly repeat = signal('');
  readonly show = signal(false);

  readonly mismatch = computed(() => !!this.repeat() && this.repeat() !== this.next());

  readonly strength = computed(() => {
    const p = this.next();
    let score = 0;
    if (p.length >= MIN_PASSWORD_LENGTH) score++;
    if (p.length >= 14) score++;
    if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score++;
    if (/\d/.test(p) || /[^A-Za-z0-9]/.test(p)) score++;
    if (p.length < MIN_PASSWORD_LENGTH) score = Math.min(score, 1);
    const levels = [
      { label: 'Too short', color: 'bg-red-500' },
      { label: 'Weak', color: 'bg-red-500' },
      { label: 'Fair', color: 'bg-amber-500' },
      { label: 'Good', color: 'bg-brand-500' },
      { label: 'Strong', color: 'bg-emerald-500' },
    ];
    return { score, ...levels[p ? score : 0] };
  });

  emit() {
    const ok = !!this.current && this.next().length >= MIN_PASSWORD_LENGTH && this.next() === this.repeat();
    this.changed.emit(ok ? { current: this.current, password: this.next() } : null);
  }
}
