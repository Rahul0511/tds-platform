import { Injectable, signal } from '@angular/core';

export interface DialogOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: 'default' | 'danger';
  /** Ask for text, e.g. the reason for a deletion. */
  input?: { label: string; placeholder?: string; required?: boolean; multiline?: boolean };
}

export interface OpenDialog extends DialogOptions {
  resolve: (value: string | boolean | null) => void;
}

/**
 * Promise-based confirm / prompt dialogs, rendered by DialogHostComponent.
 * Replaces window.confirm and window.prompt. Texts are given in English and
 * translated when shown; use I18nService.t() for texts with values.
 */
@Injectable({ providedIn: 'root' })
export class DialogService {
  readonly current = signal<OpenDialog | null>(null);

  /** Resolves true when confirmed, false when cancelled. */
  confirm(options: Omit<DialogOptions, 'input'>): Promise<boolean> {
    return this.open(options).then((v) => v === true);
  }

  /** Resolves the entered text, or null when cancelled. */
  prompt(options: DialogOptions & { input: NonNullable<DialogOptions['input']> }): Promise<string | null> {
    return this.open(options).then((v) => (typeof v === 'string' ? v : null));
  }

  close(value: string | boolean | null) {
    const d = this.current();
    this.current.set(null);
    d?.resolve(value);
  }

  private open(options: DialogOptions) {
    this.current()?.resolve(null);
    return new Promise<string | boolean | null>((resolve) => this.current.set({ ...options, resolve }));
  }
}
