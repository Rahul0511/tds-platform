import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../core/i18n/translate.pipe';
import { IconComponent } from '../shared/ui/icon.component';

@Component({
  selector: 'app-forbidden',
  imports: [RouterLink, IconComponent, TranslatePipe],
  template: `
    <div class="page grid min-h-[60vh] place-items-center text-center">
      <div>
        <span class="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-surface-2 text-muted"><app-icon name="lock" [size]="26" /></span>
        <h1 class="mt-5 text-xl font-semibold text-ink">{{ 'No access' | t }}</h1>
        <p class="mt-2 max-w-sm text-sm text-muted">{{ 'Your role does not include this page. Ask an administrator if you need it.' | t }}</p>
        <a routerLink="/" class="btn-secondary mt-6">{{ 'Back to the dashboard' | t }}</a>
      </div>
    </div>
  `,
})
export class ForbiddenComponent {}
