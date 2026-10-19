// Translation suggestions with Claude.
//
// Optional: enabled when ANTHROPIC_API_KEY (or ANTHROPIC_AUTH_TOKEN) is set
// for the server process. Suggestions are saved with status "suggested", so a
// person reviews and approves them before they count as final.

import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { listLanguages, saveTranslation, translationItems } from './i18n.js';
import { ValidationError } from './products.js';

const MODEL = process.env.TDS_AI_MODEL || 'claude-opus-5-5';
const MAX_ITEMS = 40;
const GLOSSARY_SIZE = 80;

export const aiEnabled = () => !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
export const aiStatus = () => ({ enabled: aiEnabled(), model: aiEnabled() ? MODEL : null });

let client = null;
const anthropic = () => (client ??= new Anthropic());

const Result = z.object({
  translations: z.array(z.object({ id: z.string(), text: z.string() })),
});

const placeholders = (s) => (String(s).match(/\{\{\s*\w+\s*\}\}/g) ?? []).sort().join('|');

/**
 * Translates the given items (scope + ref) into `lang` and stores the results
 * as suggestions. Returns the updated items and the ones that were skipped.
 */
export async function suggestTranslations(lang, refs, user) {
  if (!aiEnabled()) throw new ValidationError({ ai: 'AI suggestions are not set up. Start the server with ANTHROPIC_API_KEY set.' });
  const language = listLanguages().find((l) => l.code === lang && !l.base);
  if (!language) throw new ValidationError({ lang: `Unknown language "${lang}"` });
  if (!Array.isArray(refs) || !refs.length) throw new ValidationError({ items: 'Nothing selected' });
  if (refs.length > MAX_ITEMS) throw new ValidationError({ items: `At most ${MAX_ITEMS} texts per request` });

  const all = translationItems(lang);
  const wanted = new Set(refs.map((r) => `${r.scope}\u0000${r.ref}`));
  const items = all.filter((i) => wanted.has(`${i.scope}\u0000${i.ref}`));
  if (!items.length) throw new ValidationError({ items: 'None of the selected texts exist any more' });

  // Approved short translations act as the term list, so wording stays consistent.
  const glossary = all
    .filter((i) => i.status === 'approved' && i.source.length <= 80)
    .slice(0, GLOSSARY_SIZE)
    .map((i) => `${i.source} => ${i.text}`)
    .join('\n');

  const system = [
    `You translate technical data sheets (TDS) for water-based sheet-fed overprint varnishes from English into ${language.name} (${language.code}).`,
    'The readers are printers and packaging converters, so use the established technical terminology of the printing industry in that language.',
    'Rules:',
    '- Translate the meaning faithfully. Do not add, drop or soften information; legal and compliance sentences must keep their exact obligations.',
    '- Keep line breaks. A line starting with "- " is a bullet: keep the "- " prefix.',
    '- Keep placeholders like {{shelf_life_months}}, product codes (e.g. 19-470823-6), URLs, e-mail addresses, units and numbers exactly as they are.',
    '- Keep leading "*" or "**" footnote markers.',
    '- Product names and brand names (Siegwerk, Statement of Composition) stay in English.',
    '- Match the capitalisation style of the source (headings in capitals stay in capitals).',
    glossary ? `Use these approved translations for recurring terms:\n${glossary}` : '',
    'Return one translation per input id.',
  ]
    .filter(Boolean)
    .join('\n');

  const payload = items.map((i, n) => ({ id: String(n), context: `${i.group} · ${i.label}`, text: i.source }));

  const response = await anthropic().messages.parse({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: 'medium', format: zodOutputFormat(Result) },
    system,
    messages: [{ role: 'user', content: `Translate these texts:\n${JSON.stringify(payload, null, 2)}` }],
  });

  if (response.stop_reason === 'refusal') throw new Error('The translation request was declined. Translate these texts by hand.');
  if (response.stop_reason === 'max_tokens') throw new Error('The texts were too long for one request. Select fewer texts and try again.');
  const out = response.parsed_output?.translations;
  if (!out) throw new Error('No usable translation came back. Try again.');

  const byId = new Map(out.map((t) => [t.id, t.text]));
  const saved = [];
  const skipped = [];
  items.forEach((item, n) => {
    const text = byId.get(String(n))?.trim();
    // Reject results that lost a placeholder: the TDS would print an empty value.
    if (!text || placeholders(text) !== placeholders(item.source)) {
      skipped.push(item.label);
      return;
    }
    saved.push(saveTranslation({ scope: item.scope, ref: item.ref, lang, text, status: 'suggested' }, `${user} (AI)`));
  });
  return { saved, skipped };
}
