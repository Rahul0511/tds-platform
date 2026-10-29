import { Injectable, computed, signal } from '@angular/core';
import { DE } from './de';
import { EN } from './en';
import { FR } from './fr';

export type UiLang = 'en' | 'de' | 'fr';

/**
 * Languages of the app itself (menus, pages, messages). Not to be confused
 * with the TDS languages, which are managed under Translations.
 */
export const UI_LANGUAGES: { code: UiLang; name: string; locale: string }[] = [
  { code: 'en', name: 'English', locale: 'en-GB' },
  { code: 'de', name: 'Deutsch', locale: 'de-DE' },
  { code: 'fr', name: 'Français', locale: 'fr-FR' },
];

export const isUiLang = (v: unknown): v is UiLang => UI_LANGUAGES.some((l) => l.code === v);

const KEY = 'tds.uiLang';

/**
 * English is the key: a text without an entry is shown in English.
 * ui: the app's own texts, always looked up by their exact key.
 * matched: texts from the server; a key with {placeholders} also matches the
 * message with values filled in. Kept apart so that data such as a product
 * name can never be mistaken for a UI text.
 */
export interface Dictionary {
  ui: Record<string, string>;
  matched: Record<string, string>;
}

const DICTIONARIES: Record<UiLang, Dictionary> = { en: EN, de: DE, fr: FR };

interface Pattern {
  re: RegExp;
  names: string[];
  template: string;
}

function readStored(): UiLang {
  try {
    const v = localStorage.getItem(KEY);
    return isUiLang(v) ? v : 'en';
  } catch {
    return 'en';
  }
}

/**
 * Translates the app's own texts in the browser, without the browser's page
 * translation. The English text is the key, e.g. t('Sign in') or
 * t('Deleted {code}', { code }).
 *
 * Texts from the server (error messages, field labels) are English too and
 * go through the same t(). Server message keys with {placeholders} also work
 * as patterns, so "Sales code 15-1 already exists" finds "Sales code {code} already exists".
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly _lang = signal<UiLang>('en');
  readonly lang = this._lang.asReadonly();
  readonly locale = computed(() => UI_LANGUAGES.find((l) => l.code === this._lang())!.locale);

  private dict: Record<string, string> = {};
  private patterns: Pattern[] = [];
  private cache = new Map<string, string>();

  constructor() {
    this.use(readStored());
  }

  /** Switch the app's language. Remembered in this browser for the sign-in page. */
  use(lang: UiLang) {
    const d = DICTIONARIES[lang];
    this.dict = { ...d.matched, ...d.ui };
    this.patterns = compilePatterns(d.matched);
    this.cache.clear();
    this._lang.set(lang);
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(KEY, lang);
    } catch {
      /* storage blocked: the choice lasts for this visit */
    }
  }

  t(key: string, params?: Record<string, unknown>): string {
    this._lang(); // read the signal, so computed() and effects follow the language
    if (params) return interpolate(this.dict[key] ?? key, params);
    if (!key) return key;
    let out = this.cache.get(key);
    if (out === undefined) {
      out = this.lookup(key);
      this.cache.set(key, out);
    }
    return out;
  }

  /**
   * A translated sentence split around its one {placeholder}, to put markup
   * (bold text, a link, a key) in between in the language's word order.
   */
  parts(key: string): [string, string] {
    const s = this.t(key);
    const m = /\{\w+\}/.exec(s);
    return m ? [s.slice(0, m.index), s.slice(m.index + m[0].length)] : [s, ''];
  }

  private lookup(text: string): string {
    const hit = this.dict[text];
    if (hit !== undefined) return hit;
    for (const p of this.patterns) {
      const m = p.re.exec(text);
      if (!m) continue;
      // Values found in the text are translated too when they are known words (e.g. a role).
      return p.names.reduce((s, name, i) => s.split(`{${name}}`).join(this.dict[m[i + 1]] ?? m[i + 1]), p.template);
    }
    return text;
  }
}

function interpolate(template: string, params: Record<string, unknown>) {
  return template.replace(/\{(\w+)\}/g, (all, name: string) => (name in params ? String(params[name] ?? '') : all));
}

/** Keys with {placeholders} as regular expressions, most specific first. */
function compilePatterns(dict: Record<string, string>): Pattern[] {
  const out: (Pattern & { literal: number })[] = [];
  for (const [key, template] of Object.entries(dict)) {
    if (!key.includes('{')) continue;
    const names: string[] = [];
    const source = key
      .split(/(\{\w+\})/)
      .map((part) => {
        const m = /^\{(\w+)\}$/.exec(part);
        if (m) {
          names.push(m[1]);
          return '(.+?)';
        }
        return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      })
      .join('');
    if (names.length) out.push({ re: new RegExp(`^${source}$`, 's'), names, template, literal: key.replace(/\{\w+\}/g, '').length });
  }
  return out.sort((a, b) => b.literal - a.literal);
}
