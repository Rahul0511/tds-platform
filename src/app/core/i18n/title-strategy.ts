import { Injectable, effect, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { I18nService } from './i18n.service';

/** Route titles such as "Products · TDS" in the app's language, also after a language switch. */
@Injectable({ providedIn: 'root' })
export class I18nTitleStrategy extends TitleStrategy {
  private title = inject(Title);
  private i18n = inject(I18nService);
  private last: RouterStateSnapshot | null = null;

  constructor() {
    super();
    effect(() => {
      this.i18n.lang();
      if (this.last) this.updateTitle(this.last);
    });
  }

  override updateTitle(snapshot: RouterStateSnapshot) {
    this.last = snapshot;
    const title = this.buildTitle(snapshot);
    if (title) this.title.setTitle(translateTitle(this.i18n, title));
  }
}

/** "Products · TDS" -> "Produkte · TDS" */
export const translateTitle = (i18n: I18nService, title: string) =>
  title
    .split(' · ')
    .map((part) => i18n.t(part))
    .join(' · ');
