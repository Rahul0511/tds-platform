import { Component } from '@angular/core';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { IconComponent } from './icon.component';

/** Small "Test prototype" label in the top bar and on the sign-in pages. */
@Component({
  selector: 'app-prototype-badge',
  imports: [IconComponent, TranslatePipe],
  host: { class: 'no-print inline-flex' },
  template: `
    <span class="badge-amber whitespace-nowrap !py-1" [title]="'Not a production application' | t">
      <app-icon name="alert" [size]="13" />
      {{ 'TEST PROTOTYPE' | t }}
      <span class="hidden font-normal xl:inline">· {{ 'Not a production application' | t }}</span>
    </span>
  `,
})
export class PrototypeBadgeComponent {}
