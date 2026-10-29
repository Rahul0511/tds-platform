// Plain-text markup used by phrases, template texts and product text fields:
//
//   - item        bullet (consecutive bullets form one list)
//   ## Heading    sub-heading
//   **bold**      bold text
//   any other line is a paragraph; URLs become links.
//
// The result is plain data (no HTML), so the client renders it safely.

const URL_RE = /(https?:\/\/[^\s)"”]+[^\s)"”.,;:])/g;

/** One line of text -> runs of plain, bold and link text. */
export function toRuns(line) {
  const runs = [];
  String(line)
    .split(/(\*\*[^*]+\*\*)/)
    .forEach((part) => {
      if (!part) return;
      const bold = part.startsWith('**') && part.endsWith('**') && part.length > 4;
      const text = bold ? part.slice(2, -2) : part;
      for (const piece of text.split(URL_RE)) {
        if (!piece) continue;
        const run = { t: piece };
        if (bold) run.b = true;
        if (/^https?:\/\//.test(piece)) run.href = piece;
        runs.push(run);
      }
    });
  return runs;
}

/** Text -> paragraphs ('p'), bullet lists ('ul') and sub-headings ('h'). */
export function parseRich(text) {
  const out = [];
  for (const raw of String(text ?? '').split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('## ')) {
      out.push({ type: 'h', text: line.slice(3).trim() });
    } else if (/^[-–•]\s/.test(line)) {
      const item = toRuns(line.replace(/^[-–•]\s+/, ''));
      const last = out[out.length - 1];
      if (last?.type === 'ul') last.items.push(item);
      else out.push({ type: 'ul', items: [item] });
    } else {
      out.push({ type: 'p', runs: toRuns(line) });
    }
  }
  return out;
}

export const isBlankText = (v) => v === null || v === undefined || String(v).trim() === '';
