// All TDS templates. Templates are written by hand, one file per template;
// there is no template editor in the app. To add one: copy a template file,
// give it a new code, change its sections and add it to TEMPLATES below.
// README.md explains the blocks.
//
// On every start the demo server copies these into its database, so a change
// here shows up after a reload (the template's version goes up by one).

import { TemplateDefinition } from '../core/models';
import { FLEXIBLE_PACKAGING } from './flexible-packaging';
import { NARROW_WEB } from './narrow-web';
import { NARROW_WEB_SHEETS } from './narrow-web-sheets';
import { SHEETFED } from './sheetfed';

export interface TemplateSource {
  /** Stored on every product: do not change it once products use the template. */
  code: string;
  /** Business unit: NW, SF, FP … */
  bu_code: string;
  /** null = for every region */
  region_code?: string | null;
  name: string;
  description: string;
  definition: TemplateDefinition;
}

export const TEMPLATES: TemplateSource[] = [...NARROW_WEB_SHEETS, NARROW_WEB, SHEETFED, FLEXIBLE_PACKAGING];
