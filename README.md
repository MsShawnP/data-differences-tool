# Data Differences Tool

Compare two tabular data files (CSV or XLSX) and get a clear, readable report of what changed — rows added, removed, or modified, with before/after values for every field.

**Live:** https://diff.lailarallc.com

## What it does

Upload two spreadsheets. Pick key columns (or let it auto-detect). Get:

- Row-level diff: added, removed, modified (with field-level before/after)
- Column-level diff: added, removed, renamed (with similarity score)
- Tolerant matching: whitespace, numeric equivalence, leading zeros, date formats
- Template summary paragraph in plain language
- Download as Excel (styled) or CSV

Everything runs in the browser — there is no backend, so files are parsed and compared client-side and never leave the user's machine.

## Why it matters

Reconciling two versions of a spreadsheet — this month's price list against last month's, the distributor's item file against your own — is a routine task that normally means either eyeballing thousands of cells or asking someone to write a script. Both are slow, and eyeballing misses things. This tool gives analysts, consultants, finance teams, and auditors a defensible answer in seconds: exactly which rows and fields changed, stated in plain language, exportable to a styled Excel report they can attach to the file. Because nothing is uploaded to a server, it is safe to use on confidential pricing and customer data.

## Quick start

```
npm install
npm run dev
```

Opens at http://localhost:5173

**Test:**

```
npm test
```

70 tests (Vitest) covering the parser, normalizer, column detector, differ, summary generator, and export.

**Deploy:**

```
npm run deploy
```

Builds and deploys to Cloudflare Pages via Wrangler.

## Tech stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4
- SheetJS (file parsing) + ExcelJS (styled export)
- Vitest (70 tests)
- Deployed to Cloudflare Pages

## Project structure

```
src/
  lib/
    parser.ts             CSV/XLSX parsing (SheetJS)
    normalizer.ts         Tolerant value matching (whitespace, numbers, dates)
    column-detector.ts    Key-column auto-detection and rename scoring
    differ.ts             Row- and column-level diff engine
    summary-generator.ts  Plain-language summary
    export.ts             Styled Excel / CSV export (ExcelJS)
  components/ hooks/      React UI
tests/                    Vitest suites + fixtures
```

## License

MIT — see [LICENSE](LICENSE).

---
Built by [Lailara LLC](https://lailarallc.com) — data hygiene and analytics consulting for specialty food brands scaling into national retail.
