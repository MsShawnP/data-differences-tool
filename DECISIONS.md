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

### 2026-05-22 — Use UTC methods for Date normalization, keep cellDates: true
- **Why:** SheetJS parses dates inconsistently (ISO→UTC, slash→local). UTC methods give correct calendar date for the common case. Disabling cellDates would require detecting date columns from format strings (added complexity) and leaves CSV dates as unparsed strings that miss the date normalizer.
- **Scope:** `src/lib/normalizer.ts` and `src/lib/parser.ts`
- **Do not:** Switch to local time methods or disable `cellDates` without handling the column detection gap.

### 2026-05-22 — Lazy-load SheetJS and ExcelJS via dynamic import()
- **Why:** Both libraries are 400KB–940KB. Static imports produced a 1.5MB initial bundle. Dynamic imports reduce the shell to 297KB — the app loads instantly and heavy parsing/export code loads on first use.
- **Scope:** `src/lib/parser.ts`, `src/lib/export.ts`
- **Do not:** Move these back to static imports without a compelling reason (e.g., if bundle analysis shows the lazy loading adds meaningful latency to the first file upload).

### 2026-05-22 — Accept SheetJS (xlsx) npm vulnerabilities for v1
- **Why:** The community edition on npm is abandoned with no fix. Replacing it requires a significant refactor (it handles CSV parsing, XLSX parsing, column type detection, date conversion). The vulnerabilities (prototype pollution, ReDoS) are client-side only — blast radius is the uploading user's own browser tab. Users upload their own files, so the attack vector requires self-exploitation or social engineering.
- **Scope:** `src/lib/parser.ts`, dependency `xlsx`
- **Do not:** Dismiss this permanently. Revisit when ExcelJS adds CSV reading support or a maintained SheetJS fork emerges.

### 2026-07-27 — Deploy via `git push` (GitHub Actions), not local wrangler
- **Why:** `.github/workflows/deploy.yml` builds and deploys to Cloudflare Pages on every push to `main` (paths-ignore for `*.md`/`docs/**`), using `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` GitHub secrets. Running `npm run deploy` locally through a non-interactive agent shell fails — wrangler demands an API token it can't obtain without an interactive login. Push is the canonical, reproducible deploy path and needs no local Cloudflare auth.
- **Scope:** Deployment / release
- **Do not:** Run `npx wrangler pages deploy` from the agent's non-interactive shell expecting it to work. To deploy, push code changes to `main` and let CI ship it. (A `.md`-only push won't trigger a deploy — that's intended.)

### 2026-07-28 — Keep the deploy workflow on Node-24-native action versions
- **Why:** `actions/checkout@v4` and `actions/setup-node@v4` target Node 20, which GitHub force-runs on Node 24 and annotates as deprecated on every deploy. v5 of both targets Node 24 directly. Build Node moved 22 → 24 in the same pass so CI matches the local toolchain; the bundle hash was byte-identical, so the runtime change is invisible to what ships.
- **Scope:** `.github/workflows/deploy.yml`
- **Do not:** Pin actions back to v4 to silence an unrelated failure — the Node 20 deprecation returns with it.

---

## Data & Schema

[Decisions about data sources, schemas, transformations]

---

## Visualization

[Chart conventions, palette decisions, interactivity choices]

---

## Output Formats

### 2026-07-28 — The download must disclose everything the screen discloses
- **Why:** The Excel Summary sheet writes `generateSummary()` verbatim, so any dishonest verdict on screen shipped in the downloadable report too — that is how the false "Files are identical" sentence reached Excel. When the UI gained a "formatting normalized" tag, both exports gained a `Normalized` column in the same commit so the artifact a CFO opens says what the browser said.
- **Scope:** `src/lib/export.ts`, `src/components/`
- **Do not:** Add a caveat, warning, or qualifier to the UI without checking whether the Excel and CSV exports carry it too.

---

## Writing & Voice

### 2026-07-28 — Prevention rules are scoped to the surface, not the repro
- **Why:** A rule written against the input that reproduced reads as complete and is not. The 2026-05-22 rule "default to UTC methods for date normalization" named the `Date`-object branch of `normalizeDate`; the string fallback in the same function violated it for fourteen months, with the doc sitting in `docs/solutions/` the whole time. A narrow rule is worse than no rule — it occupies the slot the correct rule would fill and tells every future reader the area is handled. Companion heuristic: when you find a guard, check what it doesn't guard, because its existence is what stopped the last person looking.
- **Scope:** Global — every Prevention section in `docs/solutions/`, every DECISIONS.md "Do not," and any review of a fix that landed where the bug was reported
- **Do not:** File a prevention rule that a reader could satisfy while leaving an identical defect three lines away. Name the function or surface and enumerate its branches. Full statement: `docs/solutions/conventions/prevention-rules-are-scoped-to-the-surface.md`.

### 2026-07-28 — Never tell the user the files are "identical"
- **Why:** Comparison is deliberately tolerant — whitespace, number formatting, and date formats are normalized away, rows are matched on key columns only, and duplicate/blank-key rows are excluded. The tool therefore cannot assert byte-identity, and "Files are identical. No differences found." was a claim it had no evidence for. Verdicts now state what was actually checked: "No material differences after tolerant matching." The same gate also reports column changes, which it previously ignored entirely.
- **Scope:** `src/lib/summary-generator.ts` and any future verdict text
- **Do not:** Reintroduce "identical," "no differences," or any absolute equality claim in a verdict. Scope every no-change sentence to what the comparison actually examined.

---

## Reversed / Superseded

When a decision is overturned:
1. Strike through the original entry above (don't delete)
2. Add a new entry below with the replacement decision
3. Note the link in both directions

This preserves the history of why something is the way it is.
