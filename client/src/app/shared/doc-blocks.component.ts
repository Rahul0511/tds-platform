import { Component, input } from '@angular/core';
import { DocBlock } from '../core/models';

/** Renders paragraph / bullet blocks produced by the server rules. */
@Component({
  selector: 'app-doc-blocks',
  template: `
    @for (block of blocks(); track $index) {
      @if (block.type === 'list') {
        <ul class="list-disc pl-5">
          @for (item of block.items; track $index) {
            <li>{{ item }}</li>
          }
        </ul>
      } @else {
        <p class="whitespace-pre-line [&:not(:first-child)]:mt-0.5">{{ block.text }}</p>
      }
    }
  `,
})
export class DocBlocksComponent {
  readonly blocks = input.required<DocBlock[]>();
}
