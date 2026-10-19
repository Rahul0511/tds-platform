import { Component, OnInit, inject, input, signal } from '@angular/core';
import { ApiService } from '../core/api.service';
import { TdsDocument } from '../core/models';
import { FitResult, TdsDocumentComponent } from '../shared/tds-document.component';

/**
 * Bare page with a single TDS, without the app shell. The server's PDF export
 * opens /print/:id in a headless browser and waits for body[data-tds-ready].
 */
@Component({
  selector: 'app-print',
  imports: [TdsDocumentComponent],
  template: `
    @if (doc(); as d) {
      <app-tds-document [doc]="d" (fitted)="onFitted($event)" />
    }
  `,
})
export class PrintComponent implements OnInit {
  private api = inject(ApiService);

  readonly id = input.required<string>();
  /** ?lang=DE from the URL (the server's PDF export sets it). */
  readonly lang = input<string>('EN');
  readonly doc = signal<TdsDocument | null>(null);

  ngOnInit() {
    const body = document.body.dataset;
    delete body['tdsReady'];
    this.api.tds(Number(this.id()), this.lang() || 'EN').subscribe({
      next: (d) => {
        document.title = d.meta.fileName;
        this.doc.set(d);
      },
      error: () => {
        body['tdsError'] = 'true';
        body['tdsReady'] = 'true';
      },
    });
  }

  onFitted(fit: FitResult) {
    const body = document.body.dataset;
    body['tdsScale'] = String(fit.scale);
    body['tdsPages'] = String(fit.pages);
    // Wait for the fit style to be applied and fonts to load before signalling.
    void document.fonts.ready.then(() => requestAnimationFrame(() => (body['tdsReady'] = 'true')));
  }
}
