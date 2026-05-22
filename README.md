# Data Differences Tool

Compare two tabular data files (CSV or XLSX) and get a clear, readable report of what changed — rows added, removed, or modified, with before/after values for every field.

**Live:** https://data-differences-tool.pages.dev/

## What it does

Upload two spreadsheets. Pick key columns (or let it auto-detect). Get:

- Row-level diff: added, removed, modified (with field-level before/after)
- Column-level diff: added, removed, renamed (with similarity score)
- Tolerant matching: whitespace, numeric equivalence, leading zeros, date formats
- Template summary paragraph in plain language
- Download as Excel (styled) or CSV

Designed for non-technical users — analysts, consultants, finance, auditors — who need to reconcile spreadsheet versions without writing code.

## Run locally

```
npm install
npm run dev
```

Opens at http://localhost:5173

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4
- SheetJS (file parsing) + ExcelJS (styled export)
- Vitest (70 tests)
- Deployed to Cloudflare Pages

## Test

```
npm test
```

## Deploy

```
npm run deploy
```

Builds and deploys to Cloudflare Pages via Wrangler.
