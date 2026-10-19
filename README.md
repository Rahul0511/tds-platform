# TDS Platform (v0.1) – test prototype

> **Test prototype, not a production application.** Every page carries a
> "TEST PROTOTYPE – Not a production application" watermark
> (`client/src/app/shared/ui/watermark.component.ts`; it is not printed, so
> the TDS PDFs stay clean), and the database holds made-up test products only.

A web app that replaces `TDS_Creator_EN_v6.xlsm` and `TDS-SF-OPV-database.xlsx`
for Sheetfed water-based OPVs (varnishes).

| Part   | Tech                                   | Folder    |
| ------ | -------------------------------------- | --------- |
| Client | Angular 19, Tailwind CSS 3             | `client/` |
| Server | Node 22, Express 4, SQLite (better-sqlite3) | `server/` |

## Run it

```bash
npm run install:all   # once
npm run build         # build the Angular app
npm start             # http://localhost:3000
```

On first start the server creates `server/data/tds.db`. If the database has
no products, the server adds three made-up test products
(`99-000001-1` … `99-000003-3`, defined in `server/src/test-data.js`). To
import the Excel instead, start once with
`TDS_EXCEL_PATH=../TDS-SF-OPV-database.xlsx`.

Back to the test data at any time (deletes every product and its history;
text blocks, rules, lookups and users stay). Stop the server first:

```bash
npm run reset-test-data
```

To develop with live reload, run both of these:

```bash
npm run dev:server    # API on :3000
npm run dev:client    # app on http://localhost:4200, /api is proxied to :3000
```

Re-import the Excel at any time (products are matched on sales code and
updated; every import is logged in the history):

```bash
npm run import                          # ../TDS-SF-OPV-database.xlsx
npm run import -- "C:\path\to\file.xlsx"
```

## Sign-in and roles

On the first start the server creates an `admin` account and prints a
one-time password in the console (set `TDS_ADMIN_PASSWORD` beforehand to
choose it). The first sign-in asks for a new password.

| Role | Can do |
| --- | --- |
| **Viewer** | View products and history; preview, print and download TDS |
| **Editor** | + create, edit and delete products; edit lookups, text blocks and header rules |
| **Admin** | + users and roles (**Admin › Users & roles**), document settings, security log |

* Admins add users in **Users & roles**. Each new user (and each password
  reset) gets a one-time password that is shown once. At the first sign-in the
  user chooses the app's language (English by default, Deutsch or Français)
  and sets their own password (at least 10 characters, not containing the
  user name).
* Sessions are an httpOnly cookie (12 h, or 14 days with "Keep me signed
  in"). Passwords are stored as scrypt hashes; sessions only as SHA-256.
* After 5 wrong passwords an account is locked for one minute.
* The server checks the role on every API call; hiding buttons in the UI is
  only for convenience.
* Logins, failed logins and all user changes are in the security log.

Lost the admin password? Stop the server and run
`node -e "require('better-sqlite3')('data/tds.db').prepare('DELETE FROM users WHERE username=?').run('admin')"`
in `server/` only if no other admin exists. On the next start a new `admin`
with a fresh one-time password is created when the user table is empty;
otherwise ask another admin to reset it.

## Pages

| Page | Replaces | What it does |
| --- | --- | --- |
| **TDS Creator** | `TDS_Creator_EN_v6.xlsm` | Pick a product and preview its TDS in the Excel layout. **Download PDF** for one product, or tick several and **Export selected as ZIP**: one separate PDF per product, named with the Excel save-name rule (`code_name_vX_EN.pdf`). |
| **Database › Products** | `Masterdata` sheet | Search, add, copy, edit and delete products. Values come from drop-downs and dot pickers, there is a live TDS preview while editing, and each save creates a new version that needs a remark. |
| **Database › Lookups** | `Dropdown_EN` sheet | Manage drop-down values. A value still used by a product cannot be deleted. |
| **Database › Text blocks & rules** | Fixed text in `BasisFormular` | Edit the TDS wording (processing advice, storage …), the header rules (NPH/DFC → intended use + compliance) and the document settings. |
| **Translations** | `Data_DE` / `Data_FR` sheets | Translate every TDS text side by side with English, approve, add languages, optional AI suggestions. |
| **Change history** | – | Every change, with user, date, remark and the changed fields. |
| **Dashboard** | – | Counts, recent changes and quick actions. |
| **Admin › Users & roles** | – | Users, roles, one-time passwords, permission matrix, security log. |
| **Account** | – | Own profile, app language and password. Theme and language are also in the user menu. |

## App language (EN / DE / FR)

The app's own pages (menus, buttons, messages, server errors) are available in
English, German and French. This is separate from the TDS languages below:
switching the app to German does not change the language of a TDS document.

* Each user chooses the language at the first sign-in; it is stored with the
  user (`users.ui_language`) and applied at every sign-in. Change it any time
  under **Account** or in the user menu. The sign-in page has its own EN/DE/FR
  switch and remembers the last choice in the browser.
* The app translates itself in the browser (no browser page translation;
  `translate="no"` stops Chrome/Edge from offering it).
* Texts live in `client/src/app/core/i18n/de.ts` and `fr.ts`, keyed by the
  English text: `{{ 'Sign in' | t }}`, or `i18n.t('Deleted {name}', { name })`
  in code. A text without an entry is shown in English. Server messages are
  English and go through the same lookup; their entries are under `matched`,
  where `{placeholders}` also match messages with values filled in.
* To add a text, wrap it with `| t` and add the English key to `de.ts` and
  `fr.ts`.

## How it maps to the Excel

* `server/src/fields.js` lists every product field: label, type, which lookup
  it uses and which Masterdata column it is imported from.
* `server/src/tds.js` holds the rules that the Excel formulas used to apply:
  `up to` before the heat resistance, the `*` footnote for foil wrapping,
  the header → intended-use/compliance link, number formats such as `1,04 g/cm³`
  and `{{shelf_life_months}}` in the text. One change from Excel: **empty
  values are left out**, so the PDF has no blank rows.
* Ratings: 10 dots per property, filled up to the score, all grey for n.a.
  (the same as the conditional formatting in the template).

## Languages and translations

English is the source language; DE and FR are set up, and admins can add
more under **Translations › Languages**.

* **Everything on the TDS is translatable**: layout labels, text blocks,
  header rules (intended use, compliance), drop-down words such as "yes" or
  substrates, product descriptions and the series title. Numbers, units and
  product names stay as they are.
* **Missing translations fall back to English**, so a TDS can always be
  produced. The TDS Creator shows how many texts are missing, outdated or still
  to review for the chosen language.
* **Status per text**: *Not translated* → *To review* → *Approved*. When the
  English text changes, its translations become *Outdated* until someone
  updates them or confirms they are still correct.
* **Starter set**: on first start the server adds German and French
  translations of the standard wording as *To review*. They must be checked
  before approval; compliance and legal texts by the responsible department.
* **AI suggestions (optional)**: start the server with `ANTHROPIC_API_KEY`
  set to get a "Suggest" button per text and "AI: translate open" on the
  Translations page. Suggestions use Claude (`claude-opus-5-5`, change with
  `TDS_AI_MODEL`), follow the approved translations as a term list, keep
  placeholders such as `{{shelf_life_months}}`, and are saved as *To review*.
* **Export**: pick the language in the TDS Creator, or tick *All languages* to
  get one PDF per product and language in a ZIP (`code_name_vX_DE.pdf`).

## Page layout and pagination

* **Two pages (default)**: page 1 holds the product data, ratings and the
  processing, storage and general sections; page 2 starts with Product safety
  (intended use, compliance, preservatives, legal note), as on the original
  TDS. Each page repeats the product title, carries the company footer and
  "Page 1 / 2". Switch to **One page** (scaled to fit) under Text & rules ›
  Document settings.
* **Long lists are paged**: products, users, translations and the TDS Creator
  list in the browser; the change history and the security log on the server
  (`?limit=&offset=`), since they grow every day.

## PDF export

PDFs are made on the server (`server/src/pdf.js`): the Edge or Chrome
installed on the machine opens `/print/:id` (the same Angular component the
creator shows) and prints it to A4. No browser is downloaded.

* **One page per TDS.** If a TDS is only a little longer than one page, it is
  scaled down to fit (not below 76 %, which also covers the longer DE/FR texts). Anything longer flows to a second page
  instead of becoming unreadable. The creator shows which case applies.
* `TDS_BROWSER_PATH` picks a specific browser if auto-detection fails.
* `TDS_APP_URL` tells the server where the app runs. The default is the
  server itself (`http://localhost:3000`), which needs `npm run build` first.
  During `ng serve`, set it to `http://localhost:4200`.

## Not in this first release (on purpose)

Approval workflow for whole TDS (draft → review → published), single sign-on,
phrase library, bulk changes, publishing to the portals and reading data from SAP.
The data model and API are built so these can be added later.


## Deploy on Render

The repository has a `Dockerfile` (Angular build + API + Chromium for the PDF
export) and a `render.yaml` Blueprint.

1. Push this folder to a GitHub (or GitLab) repository. It contains no
   product data: the deployed app starts with the test products.
2. In Render: **New › Blueprint**, pick the repository, confirm. This creates
   the web service `tds-platform` with a 1 GB disk at `/var/data` for the
   database (disks need the paid *Starter* instance type or higher).
3. After the first deploy, open **Logs**: the server prints the user name
   `admin` and a one-time password. Sign in with it, choose the language and
   set your own password.

On the first start the database is empty, so the server adds the test
products and the DE/FR starter translations. Later deploys keep the data on
the disk.

| Variable | Purpose |
| --- | --- |
| `TDS_DB_PATH` | Database file, on the persistent disk (`/var/data/tds.db`) |
| `TDS_TRUST_PROXY` | `1` behind Render's proxy, so session cookies are secure |
| `TDS_ADMIN_PASSWORD` | Optional: initial admin password instead of a generated one |
| `TDS_EXCEL_PATH` | Optional: Excel imported into an empty database instead of the test products |
| `TDS_BROWSER_PATH`, `TDS_BROWSER_ARGS` | Chromium for the PDF export (set in the Dockerfile) |
| `ANTHROPIC_API_KEY` | Optional: AI translation suggestions |

Without a disk (free instance) the app runs, but every deploy or restart
starts with a fresh database.

## API (short)

```
POST   /api/auth/login {username, password, remember}   POST /api/auth/logout
GET    /api/auth/me                       POST /api/auth/password {current, password, ui_language?}
PUT    /api/auth/preferences {ui_language: en|de|fr}   GET /api/health
GET|POST /api/users   PUT|DELETE /api/users/:id   POST /api/users/:id/reset-password   GET /api/audit   (admin)
GET    /api/languages   POST /api/languages   PUT|DELETE /api/languages/:code   (admin)
GET    /api/translations?lang=DE   PUT /api/translations   POST /api/translations/approve-all
GET    /api/translations/summary   GET /api/translations/ai   POST /api/translations/suggest
GET    /api/products?search=&header=      GET  /api/tds/:id        (render-ready TDS)
GET    /api/products/:id                  GET  /api/tds/:id/pdf?lang=DE    (one PDF)
                                          GET  /api/tds/export.zip?ids=1,2&langs=EN,DE  (ZIP, one PDF per product and language)
POST   /api/products        {…, remark}   POST /api/tds/preview    (unsaved draft)
PUT    /api/products/:id    {…, remark}   GET  /api/history?limit=
DELETE /api/products/:id?remark=          GET  /api/products/:id/history
GET|POST /api/lookups   DELETE /api/lookups/:id
GET|POST /api/headers   PUT    /api/headers/:code
GET    /api/text-blocks PUT    /api/text-blocks/:key
GET|PUT /api/settings   GET    /api/stats   GET /api/meta
```
