import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth/auth.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { HeaderRule, Settings, TextBlock } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { IconComponent } from '../../shared/ui/icon.component';
import { TimeAgoPipe } from '../../shared/ui/time-ago.pipe';

type Tab = 'blocks' | 'headers' | 'settings';

/**
 * The fixed wording of the TDS (processing advice, storage, legal ...),
 * the header rules that pick intended use + compliance text, and the
 * document settings. In Excel all of this was typed into the template.
 */
@Component({
  selector: 'app-text-blocks',
  imports: [FormsModule, IconComponent, TimeAgoPipe, TranslatePipe],
  template: `
    <div class="page">
      <h1 class="page-title">{{ 'Text & rules' | t }}</h1>
      <p class="page-subtitle">{{ 'Wording that appears on every TDS, and the rules that choose it.' | t }}</p>

      <div class="mt-6 flex gap-1 border-b border-line" role="tablist">
        @for (t of tabs(); track t.id) {
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="tab() === t.id"
            class="-mb-px border-b-2 px-3 pb-3 pt-1 text-sm font-medium transition"
            [class]="tab() === t.id ? 'border-brand-600 text-ink' : 'border-transparent text-muted hover:text-ink'"
            (click)="tab.set(t.id)"
          >
            {{ t.label | t }}
          </button>
        }
      </div>

      <!-- Text blocks: list + editor -->
      @if (tab() === 'blocks') {
        <div class="mt-6 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <nav class="card h-fit p-2" [attr.aria-label]="'Text blocks' | t">
            @for (b of blocks(); track b.key) {
              <button
                type="button"
                class="block w-full rounded-lg px-3 py-2 text-left text-sm transition"
                [class]="selectedKey() === b.key ? 'bg-brand-500/10 font-medium text-brand-700 dark:text-brand-300' : 'text-ink-2 hover:bg-surface-2'"
                (click)="selectedKey.set(b.key)"
              >
                {{ b.title }}
              </button>
            }
          </nav>

          @if (selected(); as b) {
            <section class="card">
              <div class="card-header">
                <h2 class="card-title">{{ b.title }}</h2>
                @if (b.updated_by) {
                  <span class="text-xs text-muted">{{ 'Changed {when} by {name}' | t: { when: (b.updated_at | timeAgo), name: b.updated_by } }}</span>
                }
              </div>
              <div class="space-y-4 p-5">
                <div>
                  <label class="label" for="tb-title">{{ 'Heading on the TDS' | t }}</label>
                  <input id="tb-title" class="input font-medium" [(ngModel)]="b.title" />
                </div>
                <div>
                  <label class="label" for="tb-body">{{ 'Text' | t }}</label>
                  <textarea id="tb-body" rows="12" class="input font-mono text-[13px]" [(ngModel)]="b.body"></textarea>
                  <p class="hint">
                    @let bullet = i18n.parts('A line starting with {dash} becomes a bullet.');
                    @let field = i18n.parts("{placeholder} (or any product field) is replaced with the product's value.");
                    {{ bullet[0] }}<span class="kbd">- </span>{{ bullet[1] }} {{ field[0] }}<span class="kbd">{{ placeholderExample }}</span>{{ field[1] }}
                  </p>
                </div>
              </div>
              <div class="flex justify-end border-t border-line px-5 py-3">
                <button type="button" class="btn-primary" (click)="saveBlock(b)"><app-icon name="check" [size]="16" /> {{ 'Save' | t }}</button>
              </div>
            </section>
          }
        </div>
      }

      <!-- Header rules -->
      @if (tab() === 'headers') {
        <div class="mt-6 space-y-4">
          <p class="max-w-3xl text-sm text-muted">
            {{ 'The header of a product (e.g. NPH, DFC) decides its "Intended use" sentence and its compliance text. The sentence is printed after the sales code.' | t }}
          </p>
          @for (h of headers(); track h.code) {
            <section class="card">
              <div class="card-header">
                <div class="flex items-center gap-2">
                  <span class="badge-brand font-semibold">{{ h.code }}</span>
                  <span class="text-xs text-muted">{{ 'used by {n} product(s)' | t: { n: h.used_by ?? 0 } }}</span>
                </div>
                <button type="button" class="btn-secondary btn-sm" (click)="saveHeader(h)"><app-icon name="check" [size]="14" /> {{ 'Save' | t }}</button>
              </div>
              <div class="grid gap-4 p-5 lg:grid-cols-2">
                <div>
                  <label class="label" [for]="'iu-' + h.code">{{ 'Intended use' | t }}</label>
                  <textarea [id]="'iu-' + h.code" rows="5" class="input" [(ngModel)]="h.intended_use"></textarea>
                </div>
                <div>
                  <label class="label" [for]="'co-' + h.code">{{ 'Compliance text' | t }}</label>
                  <textarea [id]="'co-' + h.code" rows="5" class="input" [(ngModel)]="h.compliance"></textarea>
                </div>
              </div>
            </section>
          }
          <form class="card flex gap-2 p-4" (ngSubmit)="addHeader()">
            <label class="sr-only" for="new-header">{{ 'New header code' | t }}</label>
            <input id="new-header" name="code" class="input max-w-xs" [placeholder]="'New header code, e.g. Non NPH' | t" [(ngModel)]="newHeader" />
            <button type="submit" class="btn-secondary" [disabled]="!newHeader.trim()"><app-icon name="plus" [size]="16" /> {{ 'Add header' | t }}</button>
          </form>
        </div>
      }

      <!-- Document settings (admin) -->
      @if (tab() === 'settings') {
        <section class="card mt-6 max-w-3xl">
          <div class="card-header"><h2 class="card-title">{{ 'Document settings' | t }}</h2></div>
          <div class="grid gap-4 p-5 sm:grid-cols-3">
            <div>
              <label class="label" for="s-region">{{ 'Region' | t }}</label>
              <input id="s-region" class="input" [(ngModel)]="settings['region']" />
            </div>
            <div class="sm:col-span-2">
              <label class="label" for="s-series">{{ 'Series title' | t }}</label>
              <input id="s-series" class="input" [(ngModel)]="settings['series_title']" />
            </div>
            <div>
              <label class="label" for="s-prefix">{{ 'Product name prefix' | t }}</label>
              <input id="s-prefix" class="input" [(ngModel)]="settings['product_prefix']" />
            </div>
            <div class="sm:col-span-2">
              <label class="label" for="s-layout">{{ 'Page layout' | t }}</label>
              <select id="s-layout" class="input" [(ngModel)]="settings['page_layout']">
                <option value="two">{{ 'Two pages – Product safety, compliance and legal notes on page 2' | t }}</option>
                <option value="one">{{ 'One page – everything on one page, scaled down to fit' | t }}</option>
              </select>
            </div>
          </div>
          <div class="flex justify-end border-t border-line px-5 py-3">
            <button type="button" class="btn-primary" (click)="saveSettings()"><app-icon name="check" [size]="16" /> {{ 'Save settings' | t }}</button>
          </div>
        </section>
      }
    </div>
  `,
})
export class TextBlocksComponent {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private auth = inject(AuthService);
  readonly i18n = inject(I18nService);

  readonly tab = signal<Tab>('blocks');
  readonly tabs = computed(() => [
    { id: 'blocks' as Tab, label: 'Text blocks' },
    { id: 'headers' as Tab, label: 'Header rules' },
    ...(this.auth.isAdmin() ? [{ id: 'settings' as Tab, label: 'Document settings' }] : []),
  ]);

  readonly blocks = signal<TextBlock[]>([]);
  readonly headers = signal<HeaderRule[]>([]);
  readonly selectedKey = signal<string | null>(null);
  readonly selected = computed(() => this.blocks().find((b) => b.key === this.selectedKey()) ?? null);
  settings: Settings = {};
  newHeader = '';
  readonly placeholderExample = '{{shelf_life_months}}';

  constructor() {
    forkJoin({ blocks: this.api.textBlocks(), headers: this.api.headers(), settings: this.api.settings() }).subscribe({
      next: ({ blocks, headers, settings }) => {
        this.blocks.set(blocks);
        this.selectedKey.set(blocks[0]?.key ?? null);
        this.headers.set(headers);
        this.settings = settings;
      },
      error: (e) => this.toast.error(e, 'Could not load text blocks'),
    });
  }

  saveBlock(b: TextBlock) {
    this.api.updateTextBlock(b).subscribe({
      next: (saved) => {
        this.blocks.update((list) => list.map((x) => (x.key === saved.key ? saved : x)));
        this.toast.success(this.i18n.t('Saved "{name}"', { name: saved.title }));
      },
      error: (e) => this.toast.error(e, 'Could not save'),
    });
  }

  saveHeader(h: HeaderRule) {
    this.api.updateHeader(h).subscribe({
      next: () => this.toast.success(this.i18n.t('Saved rule {code}', { code: h.code })),
      error: (e) => this.toast.error(e, 'Could not save'),
    });
  }

  addHeader() {
    const code = this.newHeader.trim();
    if (!code) return;
    this.api.addHeader({ code, intended_use: '', compliance: '' }).subscribe({
      next: (h) => {
        this.headers.update((list) => [...list, { ...h, used_by: 0 }]);
        this.newHeader = '';
      },
      error: (e) => this.toast.error(e, 'Could not add the header'),
    });
  }

  saveSettings() {
    this.api.updateSettings(this.settings).subscribe({
      next: (s) => {
        this.settings = s;
        this.toast.success('Settings saved');
      },
      error: (e) => this.toast.error(e, 'Could not save settings'),
    });
  }
}
