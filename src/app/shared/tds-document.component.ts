import { Component, DestroyRef, ElementRef, computed, effect, inject, input, output, signal, untracked, viewChild, viewChildren } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { BlockStyle, DocBlock, RenderBlock, RenderSection, TdsDocument } from '../core/models';
import { DocBlockComponent, DocBlocksComponent } from './doc-blocks.component';

/**
 * Smallest scale used to keep a section group on one sheet (templates with
 * fitToPage). Content that would need more shrinking flows onto another
 * sheet instead.
 */
export const MIN_FIT_SCALE = 0.76;

export interface FitResult {
  /** Smallest scale of all pages: 1 = full size, < 1 = scaled down to fit */
  scale: number;
  /** Sheets the document prints on */
  pages: number;
}

type RichBlock = Extract<RenderBlock, { kind: 'rich' }>;
type TableBlock = Extract<RenderBlock, { kind: 'table' }>;
type HeadingBlock = Extract<RenderBlock, { kind: 'heading' }>;
type OtherBlock = Extract<RenderBlock, { kind: 'facts' | 'ratings' | 'columns' }>;

/** The smallest piece that goes onto a page as a whole. */
export type Unit = { breakBefore: boolean; keep: boolean } & (
  | { k: 'title'; section: RenderSection }
  | { k: 'heading'; block: HeadingBlock }
  | { k: 'rich'; block: RichBlock; doc: DocBlock; first: boolean }
  | { k: 'block'; block: OtherBlock }
  | { k: 'thead'; block: TableBlock }
  | { k: 'trow'; block: TableBlock; row: string[] }
);

/** What a page shows: units, with the rows of a table joined into one table again. */
type Item = { k: 'unit'; u: Unit } | { k: 'table'; block: TableBlock; rows: string[][]; continued: boolean };

interface Sheet {
  items: Item[];
  scale: number;
}

/** A4 minus the page padding (10 mm top and bottom), in mm. */
const PAGE_HEIGHT = 277;
const CONTENT_WIDTH = 186;

/** Document -> units in print order. A section's title and headings stay with what follows them. */
export function unitsOf(doc: TdsDocument): Unit[] {
  const out: Unit[] = [];
  for (const s of doc.sections) {
    let first = true;
    const push = (u: Unit) => {
      out.push({ ...u, breakBefore: first && s.breakBefore } as Unit);
      first = false;
    };
    if (s.title) push({ k: 'title', section: s, keep: true, breakBefore: false });
    for (const b of s.blocks) {
      switch (b.kind) {
        case 'heading':
          push({ k: 'heading', block: b, keep: true, breakBefore: false });
          break;
        case 'rich':
          b.blocks.forEach((d, i) => push({ k: 'rich', block: b, doc: d, first: i === 0, keep: d.type === 'h', breakBefore: false }));
          break;
        case 'table':
          push({ k: 'thead', block: b, keep: true, breakBefore: false });
          b.rows.forEach((row) => push({ k: 'trow', block: b, row, keep: false, breakBefore: false }));
          break;
        default:
          push({ k: 'block', block: b, keep: false, breakBefore: false });
      }
    }
  }
  return out;
}

/**
 * One TDS as A4 sheets, laid out in the browser: every unit is measured
 * off-screen, then packed onto pages with the business unit's header and
 * footer. The screen preview, the browser print and the server's PDF use
 * the same sheets, so what you see is what is printed.
 *
 *   - a section with breakBefore starts a new page
 *   - titles and headings never end a page; table headers repeat
 *   - the disclaimer and company line go on the last page
 *   - fitToPage templates scale a section group down (to 76 % at most)
 *     instead of starting another page
 */
@Component({
  selector: 'app-tds-document',
  imports: [NgTemplateOutlet, DocBlocksComponent, DocBlockComponent],
  templateUrl: './tds-document.component.html',
  host: { class: 'block' },
})
export class TdsDocumentComponent {
  readonly doc = input.required<TdsDocument>();
  readonly fitted = output<FitResult>();

  readonly units = computed(() => unitsOf(this.doc()));
  readonly sheets = signal<Sheet[]>([]);
  readonly nw = computed(() => this.doc().style === 'narrow-web');
  readonly contentWidth = CONTENT_WIDTH;

  private ref = viewChild<ElementRef<HTMLElement>>('ref');
  private headFirst = viewChild<ElementRef<HTMLElement>>('headFirst');
  private headNext = viewChild<ElementRef<HTMLElement>>('headNext');
  private footLast = viewChild<ElementRef<HTMLElement>>('footLast');
  private footNext = viewChild<ElementRef<HTMLElement>>('footNext');
  private unitEls = viewChildren<ElementRef<HTMLElement>>('unit');

  private frame = 0;

  constructor() {
    // Lay out again whenever something measured changes size (new document, fonts loaded, language switch).
    const observer = new ResizeObserver(() => this.schedule());
    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(() => {
      observer.disconnect();
      cancelAnimationFrame(this.frame);
    });
    effect(() => {
      const els = [...this.unitEls(), this.ref(), this.headFirst(), this.headNext(), this.footLast(), this.footNext()].filter(Boolean) as ElementRef<HTMLElement>[];
      observer.disconnect();
      els.forEach((e) => observer.observe(e.nativeElement));
      untracked(() => this.schedule());
    });
    // A new document with the same heights (e.g. a changed word) fires no resize: lay out again anyway.
    effect(() => {
      this.units();
      untracked(() => this.schedule());
    });
  }

  // ---- Template helpers ----

  /** Space above a unit, in mm. Part of the unit's own height, so measured and printed sizes match. */
  gap(u: Unit): string {
    const nw = this.nw();
    switch (u.k) {
      case 'title':
        return nw ? 'pt-[4.5mm]' : 'pt-[2mm]';
      case 'heading':
        return nw ? 'pt-[2.6mm]' : 'pt-[1.4mm]';
      case 'rich':
        if (!u.first) return u.doc.type === 'h' ? 'pt-[2mm]' : nw ? 'pt-[1.4mm]' : 'pt-[0.4mm]';
        return nw ? 'pt-[1.8mm]' : 'pt-[0.8mm]';
      case 'thead':
      case 'block':
        return nw ? 'pt-[2mm]' : 'pt-[1.4mm]';
      default:
        return '';
    }
  }

  styleClass(style: BlockStyle | undefined): string {
    switch (style) {
      case 'small':
        return 'text-[7pt] leading-[1.25] text-neutral-700';
      case 'note':
        return 'text-[7pt] italic leading-[1.25] text-neutral-700';
      case 'guideline':
        return 'tds-guideline';
      case 'emphasis':
        return 'font-bold';
      default:
        return '';
    }
  }

  /** Header cells of a facts table in columns: groups (CoF static / dynamic) get a shared cell. */
  factsHead(items: { label: string; group?: string }[]) {
    const top: { text: string; colspan: number; rowspan: number }[] = [];
    const sub: string[] = [];
    const grouped = items.some((i) => i.group);
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.group) {
        top.push({ text: it.label, colspan: 1, rowspan: grouped ? 2 : 1 });
        continue;
      }
      let n = 1;
      while (items[i + n]?.group === it.group) n++;
      top.push({ text: it.group, colspan: n, rowspan: 1 });
      for (let j = 0; j < n; j++) sub.push(items[i + j].label);
      i += n - 1;
    }
    return { top, sub };
  }

  positions(max: number) {
    return Array.from({ length: max }, (_, i) => i + 1);
  }

  // ---- Layout ----

  private schedule() {
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => this.layout());
  }

  private layout() {
    const ref = this.ref()?.nativeElement.getBoundingClientRect().height ?? 0;
    // Hidden (e.g. while printing): keep the last layout.
    if (!ref) return;
    const mm = ref / 297;
    const h = (el: ElementRef<HTMLElement> | undefined) => (el ? el.nativeElement.getBoundingClientRect().height / mm : 0);

    const units = this.units();
    const heights = this.unitEls().map((e) => h(e));
    if (heights.length !== units.length) return;
    const head = { first: h(this.headFirst()), next: h(this.headNext()) };
    const foot = { last: h(this.footLast()), next: h(this.footNext()) };
    const theadHeight = new Map<string, number>();
    units.forEach((u, i) => u.k === 'thead' && theadHeight.set(u.block.id, heights[i]));

    const doc = this.doc();
    const pages: { units: Unit[]; scale: number }[] = [];
    const capacity = (first: boolean, last: boolean) => PAGE_HEIGHT - (first ? head.first : head.next) - (last ? foot.last : foot.next) - 0.5;

    // Segments: a section with breakBefore starts a new one.
    const segments: number[][] = [];
    units.forEach((u, i) => (u.breakBefore || !segments.length ? segments.push([i]) : segments[segments.length - 1].push(i)));

    segments.forEach((seg, si) => {
      const lastSegment = si === segments.length - 1;
      const total = seg.reduce((s, i) => s + heights[i], 0);
      if (doc.fitToPage) {
        const cap = capacity(pages.length === 0, lastSegment);
        if (total <= cap) return void pages.push({ units: seg.map((i) => units[i]), scale: 1 });
        if (cap / total >= MIN_FIT_SCALE) {
          return void pages.push({ units: seg.map((i) => units[i]), scale: Math.floor((cap / total) * 0.985 * 1000) / 1000 });
        }
      }
      // Fill pages one after the other.
      let cur: number[] = [];
      let used = 0;
      const heightOn = (i: number, page: number[]) => {
        const u = units[i];
        // A table that continues on a new page repeats its header.
        const repeat = u.k === 'trow' && !page.some((j) => (units[j].k === 'thead' || units[j].k === 'trow') && (units[j] as { block: TableBlock }).block.id === u.block.id);
        return heights[i] + (repeat ? (theadHeight.get(u.block.id) ?? 0) : 0);
      };
      for (const i of seg) {
        const hi = heightOn(i, cur);
        if (cur.length && used + hi > capacity(pages.length === 0, false)) {
          // Titles, headings and table headers move along with what follows them.
          const carry: number[] = [];
          while (cur.length > 1 && units[cur[cur.length - 1]].keep) carry.unshift(cur.pop()!);
          pages.push({ units: cur.map((j) => units[j]), scale: 1 });
          cur = carry;
          used = cur.reduce((s, j, n) => s + heightOn(j, cur.slice(0, n)), 0);
        }
        used += heightOn(i, cur);
        cur.push(i);
      }
      if (cur.length) pages.push({ units: cur.map((j) => units[j]), scale: 1 });
    });

    // The last page also holds the disclaimer: move units over until it fits.
    const last = pages[pages.length - 1];
    if (last && last.scale === 1) {
      const fits = (p: Unit[], first: boolean) => p.reduce((s, u) => s + heights[units.indexOf(u)], 0) <= capacity(first, true);
      const moved: Unit[] = [];
      while (last.units.length > 1 && !fits(last.units, pages.length === 1)) moved.unshift(last.units.pop()!);
      while (last.units.length > 1 && last.units[last.units.length - 1].keep) moved.unshift(last.units.pop()!);
      if (moved.length) pages.push({ units: moved, scale: 1 });
    }
    if (!pages.length) pages.push({ units: [], scale: 1 });

    this.sheets.set(pages.map((p) => ({ items: itemsOf(p.units), scale: p.scale })));
    this.fitted.emit({ scale: Math.min(...pages.map((p) => p.scale)), pages: pages.length });
  }
}

/** Joins the header and rows of a table that ended up on the same page. */
function itemsOf(units: Unit[]): Item[] {
  const items: Item[] = [];
  for (const u of units) {
    if (u.k === 'thead' || u.k === 'trow') {
      const last = items[items.length - 1];
      if (last?.k === 'table' && last.block.id === u.block.id) {
        if (u.k === 'trow') last.rows.push(u.row);
        continue;
      }
      items.push({ k: 'table', block: u.block, rows: u.k === 'trow' ? [u.row] : [], continued: u.k === 'trow' });
      continue;
    }
    items.push({ k: 'unit', u });
  }
  return items;
}
