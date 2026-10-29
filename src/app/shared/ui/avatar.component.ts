import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const COLORS = ['bg-brand-600', 'bg-sky-600', 'bg-violet-600', 'bg-amber-600', 'bg-rose-600', 'bg-emerald-600', 'bg-indigo-600', 'bg-teal-700'];

/** Initials in a coloured circle; the colour is stable per name. */
@Component({
  selector: 'app-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex shrink-0' },
  template: `
    <span
      class="grid place-items-center rounded-full font-semibold text-white ring-2 ring-surface"
      [class]="color()"
      [style.width.px]="size()"
      [style.height.px]="size()"
      [style.font-size.px]="size() * 0.4"
      aria-hidden="true"
      >{{ initials() }}</span
    >
  `,
})
export class AvatarComponent {
  readonly name = input.required<string>();
  readonly size = input(32);

  readonly initials = computed(() => {
    const parts = this.name().trim().split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] ?? '?') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  });
  readonly color = computed(() => {
    let h = 0;
    for (const ch of this.name()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return COLORS[h % COLORS.length];
  });
}
