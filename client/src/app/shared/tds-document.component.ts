import { Component, DestroyRef, ElementRef, computed, effect, inject, input, output, signal, viewChildren } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { TdsDocument } from '../core/models';
import { DocBlocksComponent } from './doc-blocks.component';

/**
 * Smallest scale used to keep a page's content on one sheet. Content that
 * would need more shrinking than this is not squeezed; it flows onto an
 * extra sheet instead.
 */
export const MIN_FIT_SCALE = 0.76;

export interface FitResult {
  /** Smallest scale of all pages: 1 = full size, < 1 = scaled down to fit */
  scale: number;
  /** Sheets the document prints on */
  pages: number;
}

type Part = 'main' | 'safety';

/**
 * One TDS as A4 sheets. Layout follows the BasisFormular sheet of
 * TDS_Creator_EN_v6.xlsm; the content comes ready-made from the server.
 *
 * Layout "two" (default) puts Product safety and the following sections on
 * page 2, as on the original TDS; layout "one" keeps everything on one page.
 *
 * Fit to page: the printable area is 186 x 277 mm (A4 minus the @page margins
 * in styles.css), the same width as the content on screen. If a page's
 * content is a little taller, its --tds-fit scales it down when printing.
 */
@Component({
  selector: 'app-tds-document',
  imports: [DocBlocksComponent, NgTemplateOutlet],
  templateUrl: './tds-document.component.html',
  host: { class: 'block' },
})
export class TdsDocumentComponent {
  readonly doc = input.required<TdsDocument>();
  readonly fitted = output<FitResult>();

  readonly pages = computed<{ parts: Part[] }[]>(() =>
    this.doc().layout === 'one' ? [{ parts: ['main', 'safety'] }] : [{ parts: ['main'] }, { parts: ['safety'] }],
  );
  readonly fits = signal<number[]>([]);
  readonly positions = computed(() => Array.from({ length: this.doc().ratingMax }, (_, i) => i + 1));

  private bodies = viewChildren<ElementRef<HTMLElement>>('body');
  private feet = viewChildren<ElementRef<HTMLElement>>('foot');
  private pageHeights = viewChildren<ElementRef<HTMLElement>>('pageHeight');

  constructor() {
    // Re-measure whenever a page's content changes size (new document, fonts loaded, language switch).
    const observer = new ResizeObserver(() => this.measure());
    inject(DestroyRef).onDestroy(() => observer.disconnect());
    effect(() => {
      const bodies = this.bodies();
      observer.disconnect();
      bodies.forEach((b) => observer.observe(b.nativeElement));
    });
  }

  fitOf(index: number) {
    return this.fits()[index] ?? 1;
  }

  private measure() {
    const bodies = this.bodies();
    const feet = this.feet();
    const heights = this.pageHeights();
    if (!bodies.length || bodies.length !== heights.length) return;

    const scales: number[] = [];
    let sheets = 0;
    for (let i = 0; i < bodies.length; i++) {
      const page = heights[i].nativeElement.offsetHeight;
      const content = bodies[i].nativeElement.offsetHeight + (feet[i]?.nativeElement.offsetHeight ?? 0);
      if (!page || !content) return;
      // Both sit in the same (possibly zoomed) box, so the ratio is zoom-independent.
      const needed = content / page;
      if (needed <= 1) {
        scales.push(1);
        sheets += 1;
      } else {
        const scale = Math.floor((1 / needed) * 0.985 * 1000) / 1000; // small safety margin
        if (scale >= MIN_FIT_SCALE) {
          scales.push(scale);
          sheets += 1;
        } else {
          scales.push(1);
          sheets += Math.ceil(needed);
        }
      }
    }

    const prev = this.fits();
    if (prev.length !== scales.length || prev.some((s, i) => s !== scales[i])) this.fits.set(scales);
    this.fitted.emit({ scale: Math.min(...scales), pages: sheets });
  }
}
