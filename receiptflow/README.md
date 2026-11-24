# ReceiptFlow

Scan receipts, track expenses, set budgets and review reports. This is the React rebuild of ReceiptFlow:
**React 19 · Vite · TypeScript · Tailwind CSS 4 · React Router 7 · Lucide icons**, on the same Supabase backend
(Google sign-in, Postgres with row-level security, private Storage bucket).

## Run it

```bash
npm install
npm run dev          # http://localhost:3000  (uses .env -> your Supabase project)
```

`.env` is already filled in with the project URL and publishable key from the original `js/config.js`
(the publishable key is meant for browsers; never put a service-role key in it). To use another project, copy
`.env.example` and set `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.

### One thing to update in Supabase

Google sign-in returns to the page that started it. The old site used `login.html` / `register.html`; the new
routes are clean URLs. In **Supabase → Authentication → URL Configuration → Redirect URLs** add:

```
http://localhost:3000/login
http://localhost:3000/register
https://YOUR-DEPLOYED-SITE/login
https://YOUR-DEPLOYED-SITE/register
```

(Keep the old entries if the old site is still live.) The database does not change. `supabase/schema.sql` is
the same file as before; run it once on a new project.

### Try it with no backend

```bash
npm run dev:mock     # http://localhost:5174
```

An in-memory Supabase and a simulated OCR (always "reads" the same sample receipt) so you can click through
everything offline: Create account → Log in → seeded sample data. State lives in `localStorage`
(`__mock.reset()` in the console wipes it). Production builds never include the mock.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server against your Supabase project |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | 37 unit/component tests (parser, budgets, dates, CSV, theme contrast, UI) |
| `npm run typecheck` | TypeScript only |
| `npm run dev:mock` | Offline sandbox (see above) |

## Deploying

`npm run build` and host `dist/` anywhere that can rewrite unknown paths to `index.html`. Config is included for
Netlify (`public/_redirects`) and Vercel (`vercel.json`). Set the two `VITE_SUPABASE_*` variables in the host.

## What's in the app

Landing · Login / Register (Gmail + Google only, same rules as before) · Dashboard · Scan Receipt · Receipts ·
Expenses · Daily Tracker · Categories · Budgets · Reports · Notifications · Settings.

All original behaviour is kept: OCR in the browser, receipt + expense saved atomically through
`save_receipt_with_expense`, private image storage with signed URLs, budget alerts at 80% (one per budget
per period), CSV export with formula-injection protection, delete-all-data.

### Added on top

- **Theme system**: light / dark / system, 6 accent presets + any custom colour, 6 background tints + custom.
  Saved on the device and applied before first paint (no flash). All tokens are generated in OKLCH and the
  tests assert WCAG AA contrast for every accent × background × mode, plus extreme custom colours.
- Responsive shell: collapsible sidebar (remembered), mobile drawer, tables that become cards on phones.
- Toasts, accessible confirm dialogs (type `DELETE` to wipe data), skeleton / empty / error states,
  inline form validation with focus on the first error, breadcrumbs, skip link, reduced-motion support.
- Search + filters on Receipts and Expenses, "show more" paging, receipt image lightbox.
- Edit category name/colour; per-category colours in charts; month picker and 6-month trend in Reports;
  7-day chart in Daily Tracker; unread dot on the bell; "Reference" on a scan is saved into the expense notes.
- A scan that finds a receipt but not its total now lets you type the total (before, it dead-ended).
- Dates are parsed as local dates (no off-by-one for users west of UTC).

## Structure

```
src/
  components/  ui/ (Button, Field, Card, Modal, …)  layout/  charts/  common/  marketing/
  context/     Auth, Data, Theme, Toast, Confirm
  hooks/  layouts/  pages/
  lib/         pure logic: parser, budgets, dates, csv, colour + theme engine
  services/    supabase client, auth flow, data API, OCR
tests/         unit + component tests, plus the offline mocks
supabase/      schema.sql, reset.sql (unchanged)
```
