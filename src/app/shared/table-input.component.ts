import { Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { TranslatePipe } from '../core/i18n/translate.pipe';
import { TableColumn } from '../core/models';
import { IconComponent } from './ui/icon.component';

/**
 * Rows of a table field (anilox rollers, product list). Pasting cells copied
 * from Excel fills the table from the cell pasted into, adding rows as needed.
 */
@Component({
  selector: 'app-table-input',
  imports: [IconComponent, TranslatePipe],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => TableInputComponent), multi: true }],
  template: `
    <div class="overflow-x-auto rounded-lg border border-line">
      <table class="w-full min-w-[640px] table-fixed text-sm">
        <thead>
          <tr class="bg-surface-2/60 text-left text-xs text-muted">
            <th class="w-8 px-2 py-2 font-medium">#</th>
            @for (c of columns(); track c.key) {
              <th class="px-2 py-2 align-bottom text-[11px] font-medium leading-tight" [style.width.%]="c.width" [title]="c.label | t">
                <span class="line-clamp-3">{{ c.label | t }}</span>
              </th>
            }
            <th class="w-24"><span class="sr-only">{{ 'Actions' | t }}</span></th>
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track $index; let r = $index; let last = $last) {
            <tr class="border-t border-line">
              <td class="px-2 text-xs tabular-nums text-subtle">{{ r + 1 }}</td>
              @for (c of columns(); track c.key; let ci = $index) {
                <td class="p-1">
                  <input
                    class="input h-8 px-2 text-[13px]"
                    [value]="row[ci] || ''"
                    [attr.aria-label]="(c.label | t) + ' ' + (r + 1)"
                    [disabled]="disabled()"
                    (input)="set(r, ci, $any($event.target).value)"
                    (paste)="paste($event, r, ci)"
                  />
                </td>
              }
              <td class="whitespace-nowrap px-1 text-right">
                <button type="button" class="btn-icon h-7 w-7" [disabled]="disabled() || r === 0" [attr.aria-label]="'Move up' | t" (click)="move(r, -1)">
                  <app-icon name="chevron-down" [size]="14" class="rotate-180" />
                </button>
                <button type="button" class="btn-icon h-7 w-7" [disabled]="disabled() || last" [attr.aria-label]="'Move down' | t" (click)="move(r, 1)">
                  <app-icon name="chevron-down" [size]="14" />
                </button>
                <button type="button" class="btn-icon h-7 w-7 hover:!text-red-600" [disabled]="disabled()" [attr.aria-label]="'Delete row' | t" (click)="remove(r)">
                  <app-icon name="x" [size]="14" />
                </button>
              </td>
            </tr>
          } @empty {
            <tr>
              <td [attr.colspan]="columns().length + 2" class="px-3 py-4 text-center text-xs text-muted">{{ 'No rows. The table is left out of the TDS.' | t }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
    <div class="mt-2 flex flex-wrap items-center gap-3">
      <button type="button" class="btn-secondary btn-sm" [disabled]="disabled()" (click)="add()"><app-icon name="plus" [size]="14" /> {{ 'Add row' | t }}</button>
      <span class="text-xs text-muted">{{ 'Tip: copy cells in Excel and paste them into a cell here.' | t }}</span>
    </div>
  `,
})
export class TableInputComponent implements ControlValueAccessor {
  readonly columns = input.required<TableColumn[]>();
  readonly rows = signal<string[][]>([]);
  readonly disabled = signal(false);

  private onChange: (v: string[][] | null) => void = () => {};
  private onTouched: () => void = () => {};

  set(r: number, c: number, value: string) {
    this.update((rows) =>
      rows.map((row, i) => (i === r ? Array.from({ length: Math.max(row.length, c + 1) }, (_, j) => (j === c ? value : (row[j] ?? ''))) : row)),
    );
  }

  add() {
    this.update((rows) => [...rows, this.columns().map(() => '')]);
  }

  remove(r: number) {
    this.update((rows) => rows.filter((_, i) => i !== r));
  }

  move(r: number, by: number) {
    this.update((rows) => {
      const next = [...rows];
      const [row] = next.splice(r, 1);
      next.splice(r + by, 0, row);
      return next;
    });
  }

  /** Tab-separated cells from a spreadsheet: fill from (r, c) onwards. */
  paste(e: ClipboardEvent, r: number, c: number) {
    const text = e.clipboardData?.getData('text/plain') ?? '';
    if (!/[\t\n]/.test(text.trim())) return; // a single value: normal paste
    e.preventDefault();
    const lines = text.replace(/\r/g, '').replace(/\n$/, '').split('\n');
    const width = this.columns().length;
    this.update((rows) => {
      const next = rows.map((row) => [...row]);
      lines.forEach((line, i) => {
        while (next.length <= r + i) next.push(Array(width).fill(''));
        line.split('\t').forEach((cell, j) => {
          if (c + j < width) next[r + i][c + j] = cell.trim();
        });
      });
      return next;
    });
  }

  // Called before the inputs may be set, so it does not read columns().
  writeValue(v: string[][] | null): void {
    this.rows.set((Array.isArray(v) ? v : []).map((row) => (Array.isArray(row) ? row.map((cell) => String(cell ?? '')) : [])));
  }
  registerOnChange(fn: (v: string[][] | null) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(d: boolean): void {
    this.disabled.set(d);
  }

  private update(fn: (rows: string[][]) => string[][]) {
    this.rows.update(fn);
    const rows = this.rows();
    this.onChange(rows.length ? rows : null);
    this.onTouched();
  }
}
