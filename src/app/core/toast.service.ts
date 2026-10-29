import { Injectable, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { I18nService } from './i18n/i18n.service';

export interface Toast {
  id: number;
  kind: 'success' | 'error';
  text: string;
}

@Injectable({ providedIn: 'root' })
/** Texts are translated here, so callers pass English (server messages are English too). */
export class ToastService {
  private i18n = inject(I18nService);
  readonly toasts = signal<Toast[]>([]);
  private seq = 0;

  success(text: string) {
    this.push('success', text);
  }

  error(err: unknown, fallback = 'Something went wrong') {
    const text =
      err instanceof HttpErrorResponse
        ? err.status === 0
          ? 'Something went wrong'
          : ((Object.values(err.error?.fields ?? {})[0] as string | undefined) ?? err.error?.error ?? fallback)
        : fallback;
    this.push('error', text);
  }

  dismiss(id: number) {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }

  private push(kind: Toast['kind'], text: string) {
    const id = ++this.seq;
    this.toasts.update((list) => [...list, { id, kind, text: this.i18n.t(text) }]);
    setTimeout(() => this.dismiss(id), kind === 'error' ? 6000 : 3000);
  }
}
