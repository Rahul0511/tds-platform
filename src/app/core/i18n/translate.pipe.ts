import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from './i18n.service';

/**
 * {{ 'Sign in' | t }} or {{ 'Deleted {code}' | t: { code } }}.
 * Impure, so a language switch updates the page at once; a lookup is a map read.
 */
@Pipe({ name: 't', pure: false })
export class TranslatePipe implements PipeTransform {
  private i18n = inject(I18nService);

  transform(key: string | null | undefined, params?: Record<string, unknown>): string {
    return key == null ? '' : this.i18n.t(String(key), params);
  }
}
