import { Component, input } from '@angular/core';
import { DocBlock, Run } from '../core/models';

/** Bold and link runs of one line of text. */
@Component({
  selector: 'app-runs',
  template: `@for (r of runs(); track $index) {
    @if (r.href) {
      <a class="tds-link" [href]="r.href" target="_blank" rel="noopener">{{ r.t }}</a>
    } @else if (r.b) {
      <strong class="font-bold">{{ r.t }}</strong>
    } @else {
      <span>{{ r.t }}</span>
    }
  }`,
})
export class RunsComponent {
  readonly runs = input.required<Run[]>();
}

/** One paragraph, bullet list or sub-heading. */
@Component({
  selector: 'app-doc-block',
  imports: [RunsComponent],
  template: `
    @let b = block();
    @switch (b.type) {
      @case ('ul') {
        <ul class="tds-list">
          @for (item of b.items; track $index) {
            <li><app-runs [runs]="item" /></li>
          }
        </ul>
      }
      @case ('h') {
        <p class="tds-subheading">{{ b.text }}</p>
      }
      @default {
        <p><app-runs [runs]="b.runs" /></p>
      }
    }
  `,
  host: { class: 'block' },
})
export class DocBlockComponent {
  readonly block = input.required<DocBlock>();
}

/** Paragraphs, bullet lists and sub-headings produced by the server's rich text rules. */
@Component({
  selector: 'app-doc-blocks',
  imports: [DocBlockComponent],
  template: `
    @for (b of blocks(); track $index) {
      <app-doc-block [block]="b" />
    }
  `,
  host: { class: 'tds-blocks block' },
})
export class DocBlocksComponent {
  readonly blocks = input.required<DocBlock[]>();
}
