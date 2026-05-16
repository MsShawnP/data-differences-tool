# data-differences-tool — Decisions Log

Permanent record of choices that should survive session turnover.
If a decision is reversed, strike it through and add the replacement
below — don't delete.

---

## Format

Each entry:
- **Date** — when decided
- **Decision** — one sentence, imperative voice
- **Why** — the reasoning, including what was tried and rejected
- **Scope** — what this applies to (file, chunk, deliverable, or "global")
- **Do not** — explicit anti-instructions, if any

---

## Architecture & Pipeline

### 2026-05-16 — Build as a web app, not a CLI tool
- **Why:** Target users (analysts, consultants, ops, finance) won't open a terminal. Adoption requires zero-friction browser access.
- **Scope:** Global
- **Do not:** Build a CLI-first tool with a web wrapper bolted on later.

### 2026-05-16 — React 19 + Vite + Tailwind v4 + Cloudflare Pages
- **Why:** Modern stack, fast builds, zero-config Tailwind v4, Pages gives free hosting with no traffic-based billing.
- **Scope:** Global
- **Do not:** Add Next.js or server-side rendering — this is a pure SPA.

### 2026-05-16 — SheetJS for reading, ExcelJS for writing
- **Why:** SheetJS free reads CSV/XLSX well but can't style output cells. ExcelJS provides cell highlighting (green/red/yellow) needed for usable Excel downloads.
- **Scope:** File parsing + export modules

### 2026-05-16 — Custom diff engine over daff library
- **Why:** Need full control over normalization pipeline (numeric tolerance, date unification, leading zeros). daff doesn't support configurable tolerant matching.
- **Scope:** `src/lib/differ.ts`

### 2026-05-16 — Levenshtein + Jaccard for column rename detection
- **Why:** Pure name similarity misses renames when names change significantly (employee_name → emp_name). Content similarity (60% weight) catches renames based on overlapping values.
- **Scope:** `src/lib/column-detector.ts`
- **Threshold:** combined score > 0.7 (40% name + 60% content)

### 2026-05-16 — Self-host fonts via @fontsource-variable packages
- **Why:** Lailara design system requires self-hosted fonts (no CDN). Fontsource bundles woff2 into the build output, one import per font, variable font support built in.
- **Scope:** All Lailara projects needing Playfair Display or Source Sans 3
- **Do not:** Use Google Fonts CDN links or manually manage woff2 files when fontsource packages exist

### 2026-05-16 — Use discriminated unions for RowChange types, not optional properties
- **Why:** Optional `changes` property on a shared interface allowed unsafe access without narrowing. Discriminated union (AddedRow | RemovedRow | ModifiedRow) makes the compiler enforce correct property access per type.
- **Scope:** `src/types/index.ts`, any code consuming RowChange
- **Do not:** Add new row-change variants as optional properties on a base interface.

---

## Data & Schema

[Decisions about data sources, schemas, transformations]

---

## Visualization

[Chart conventions, palette decisions, interactivity choices]

---

## Output Formats

[Decisions about deliverable formats, structure, organization]

---

## Writing & Voice

[Voice, style, terminology decisions specific to this project]

---

## Reversed / Superseded

When a decision is overturned:
1. Strike through the original entry above (don't delete)
2. Add a new entry below with the replacement decision
3. Note the link in both directions

This preserves the history of why something is the way it is.
