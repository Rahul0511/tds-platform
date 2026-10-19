import { Component, computed, inject } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';

const escapeXml = (s: string) => s.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * "TEST PROTOTYPE – Not a production application", repeated diagonally over
 * every page. Clicks pass through; it is not printed, so the TDS PDFs stay clean.
 */
@Component({
  selector: 'app-watermark',
  host: {
    class: 'no-print pointer-events-none fixed inset-0 z-[100] select-none',
    'aria-hidden': 'true',
    '[style.background-image]': 'image()',
  },
  template: '',
})
export class WatermarkComponent {
  private i18n = inject(I18nService);

  readonly image = computed(() => {
    const title = escapeXml(this.i18n.t('TEST PROTOTYPE'));
    const note = escapeXml(this.i18n.t('Not a production application'));
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="460" height="300">` +
      `<g transform="rotate(-28 230 150)" text-anchor="middle" font-family="Inter, Arial, sans-serif" fill="#c8102e" fill-opacity="0.09">` +
      `<text x="230" y="146" font-size="30" font-weight="700" letter-spacing="2">${title}</text>` +
      `<text x="230" y="174" font-size="15" font-weight="600">${note}</text>` +
      `</g></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  });
}
