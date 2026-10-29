# TDS Platform (v0.3) – static website

> **Test prototype.** The sample products are made up. A "Test prototype" label
> sits in the top bar (not printed).

Technical data sheets (TDS) for the ink business, made in the browser. Pick a
product, see its TDS on A4 pages in English, German or French, and print it
or save it as a PDF. There is no server and no database: the site is plain
static files, built with Angular 19 and Tailwind CSS 3.

## Run and build

```bash
npm install      # once
npm start        # http://localhost:4200, reloads on changes
npm run build    # static site in dist/
```

`dist/` can be served from any static host or file share: Render (see
`render.yaml`), GitHub Pages, Netlify, an IIS or nginx folder. URLs use a hash
(`#/edit/…`) and the base href is relative, so no rewrite rules are needed and
a sub-folder works. Opening `dist/index.html` straight from disk does not work;
browsers block the scripts. Serve the folder instead (for example
`npx http-server dist`).

## Where the data is

Products are stored in the **browser's local storage**. Each browser has its
own copy. The first visit starts with the sample products.

* **Data › Export all products** saves every product as a `.json` file, as a
  backup or to move them to another browser or person.
* **Data › Import products** adds the products of such a file; a product with
  the same id is replaced.
* **Data › Restore sample data** replaces all products with the samples.

Clearing the browser's site data deletes the products, so export what you
want to keep. Templates, standard texts and translations are part of the code
and are the same for everybody.

## Pages

| Page | What it does |
| --- | --- |
| **Data sheets** | Products grouped by template. The selected one is shown as A4 pages; switch EN / DE / FR, zoom, **Edit**, **Print / PDF**. Tick several products to print them in one go |
| **Edit / New data sheet** | The form follows the template. Live preview beside it. **Translations** tab for the product's own texts in DE and FR. Every save raises the version |
| **Templates** | Read-only list of the templates, their sections and the fields each one asks for |

**PDF:** Print / PDF opens the browser's print dialog; choose *Save as PDF*.
The file name is suggested as `code_name_vX_EN`. Each sheet is exactly A4, and
the margins come from the layout, so set *Margins: none* only if your browser
adds its own.

## How a TDS is made

```
src/app/tds/fields.ts        field catalog + drop-down values
src/app/tds/templates/*.ts   one file per template: sections → blocks
src/app/tds/phrases.ts       standard texts the templates print
src/app/tds/translations.ts  DE / FR wording, matched by the English text
        │
        ▼
src/app/tds/generator.ts     product + template → document (fills values, picks texts,
        │                    translates, drops empty parts)
        ▼
src/app/document/            lays the document out on A4 pages (preview = print)
```

Blocks without content and sections without blocks are left out, so a TDS
never has empty rows or sections, and section numbers close up.

## Adding or changing a template

Templates are written by hand. There is no template editor in the site.

1. Copy the closest template in `src/app/tds/templates/` (for example
   `narrow-web.ts` to `narrow-web-ledtec.ts`). Rename the constant and give
   it a new, unique `code`. Products store the code, so do not change the code
   of a template that products already use.
2. Set `name`, `businessUnit`, `description`, the layout `style`
   (`'narrow-web'` or `'sheetfed'`), `docTitle` and the `footer`.
3. Edit `sections`. Each section has a `title` and `blocks`:

   | Block `type` | Prints |
   | --- | --- |
   | `text` | a phrase (`phrase: 'doubt'`) or its own `text` |
   | `field` | one product field; `inline: true` prints "Label: value" |
   | `facts` | several values in rows, or side by side with `layout: 'columns'` |
   | `table` | a table field (anilox rollers, product list) |
   | `choice` | a text picked by a field's value, e.g. the safety text by `intended_use` |
   | `ratings` | 1–10 dot scales |
   | `group` | a `heading`, printed only when a block inside has content |
   | `columns` | blocks side by side |

   Any section or block can have `when`, e.g.
   `when: { field: 'product_type', op: 'in', value: ['Ink', 'Ink series'] }`.
   Operators: `eq`, `ne`, `in`, `notIn`, `empty`, `notEmpty`, `yes`, `no`.
4. Add the template to `TEMPLATES` in `src/app/tds/templates/index.ts`.
5. Run `npm start`. The product form now offers the template and shows the
   fields it uses. A mistake such as an unknown field, an unknown phrase or a
   duplicate block id is shown in a red bar at the top of the site.

Shared sections (product safety, properties, shelf life, product list) are in
`shared-sections.ts`. A change there affects every template that uses them.

**New field:** add it to `FIELDS` in `fields.ts` (and its drop-down values to
`LOOKUPS` if it is a `select`), then use it in a template.

**New standard text:** add it to `PHRASES` in `phrases.ts` and refer to it by
its key.

Texts use a small markup: a line starting with `- ` is a bullet, `## ` is a
sub-heading, `**bold**` is bold; URLs become links; `{{shelf_life_months}}` (or
any field key) is replaced with the product's value.

## Translations

English is the source. `translations.ts` holds the German and French wording
of the standard texts, headings, labels and drop-down values, **matched by the
exact English text**. When you change an English phrase or heading, update its
entry there too, or the TDS prints that text in English. The Data sheets page
says how many texts on a sheet have no translation.

A product's own texts (description, properties …) are translated per product
under **Edit › Translations**. Compliance and legal texts must be checked by
the responsible department.

## Changes from v0.2

v0.2 had a Node.js / SQLite server. It is gone, and with it everything that
needed it: sign-in, users and roles, regions and business-unit access, the
change history, server-side PDF and ZIP export, the Excel import, the
translation workflow and AI suggestions, the template designer, and the app
language switch (the site itself is in English; data sheets are EN / DE / FR).
The templates, phrase library, translations, field catalog, sample data and
the A4 page layout carried over unchanged.
