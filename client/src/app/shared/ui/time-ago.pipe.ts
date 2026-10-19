import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 864e5],
  ['month', 30 * 864e5],
  ['week', 7 * 864e5],
  ['day', 864e5],
  ['hour', 36e5],
  ['minute', 6e4],
];

const formats = new Map<string, Intl.RelativeTimeFormat>();
const formatFor = (locale: string) => {
  let f = formats.get(locale);
  if (!f) formats.set(locale, (f = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })));
  return f;
};

/** "3 hours ago", "yesterday", "just now", in the app's language. Impure, so it follows a language switch. */
@Pipe({ name: 'timeAgo', pure: false })
export class TimeAgoPipe implements PipeTransform {
  private i18n = inject(I18nService);

  transform(iso: string | null | undefined, empty = '–'): string {
    if (!iso) return this.i18n.t(empty);
    const diff = new Date(iso).getTime() - Date.now();
    const fmt = formatFor(this.i18n.locale());
    for (const [unit, ms] of UNITS) {
      if (Math.abs(diff) >= ms) return fmt.format(Math.round(diff / ms), unit);
    }
    return this.i18n.t('just now');
  }
}
