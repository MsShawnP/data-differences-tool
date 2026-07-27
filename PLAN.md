# data-differences-tool — Current Work Plan

The current arc of work. Updated when the arc changes, not every
session. For session-by-session state, see HANDOFF.md.

---

## Goal

Make the Data Differences Tool presentable enough to hand a CEO, CFO, or
consultant a naked link with no explanation needed.

## Why this arc, why now

v1.0 is functionally complete. The gap is first-impression credibility:
no favicon, no link preview, no branding, and the /improve audit is
overdue. This is a 30–60 minute pass, not a feature arc.

## Tasks

### 1. Favicon + Apple touch icon
- [x] Add Lailara favicon (SVG 32×32 + ICO fallback)
- [x] Add to `index.html` `<head>`
- [ ] Apple touch icon 180×180 PNG (needs conversion tool — deferred)

### 2. HTML meta tags
- [x] `<title>`: "Data Differences Tool — Lailara LLC"
- [x] `<meta name="description">`
- [x] OG tags (og:title, og:description, og:type=website, og:url)
- [x] Twitter card (summary + title + description)

### 3. Lailara wordmark in footer
- [x] "Built by Lailara LLC" text link in footer
- [x] Links to lailarallc.com
- [x] Subtle — warm-gray, underlined, centered

### 4. Visual QA pass
- [ ] Full click-through on desktop: upload CSV pair, XLSX pair, mixed
- [ ] Verify auto-detect copy is clear
- [ ] Verify download buttons work (Excel + CSV)
- [x] Check mobile viewport (iPhone SE width minimum) — zones stack, no overflow at 375px
- [ ] Confirm fonts load (Playfair Display headings, Source Sans 3 body)

### 5. /improve audit-only
- [x] Run /improve (full pass, 2026-07-27) + full code review + UI review
- [x] Fix P1 findings (CSV formula injection)
- [x] Fix P2 findings that were safe (perf, export errors, warnings, stale auto-detect, dead reordered data)
- [ ] Blank-key matching semantics: deliberately NOT changed — intentional + tested. See open question in Improvement History.

### 6. Redeploy
- [x] `npm run deploy`
- [ ] Verify live at diff.lailarallc.com
- [ ] Spot-check OG preview (paste URL in Slack or https://metatags.io)

## Definition of done for this arc

- [ ] Link preview in Slack/iMessage shows title + description (not blank)
- [ ] Favicon visible in browser tab
- [ ] Footer credits Lailara
- [ ] No visual regressions from v1.0
- [ ] /improve audit current

## Out of scope

- New features (v1.1 is polish only)
- SheetJS replacement
- Analytics / tracking
- Auth or persistence

---

## Arc history

When an arc completes, archive its goal, completion date, and outcome
here. Then start a new arc above. Provides continuity without bloating
the active plan.

### 2026-05-22 — Ship a deployed tabular diff web app
- Outcome: All 12 definition-of-done items complete. App live at https://diff.lailarallc.com/. First /improve pass completed (8 fixes). 70 tests, 297KB initial bundle.
- Tag: v1.0

---

## Improvement history

Track when this project was reviewed and improved via /improve.
Each entry records what was found, what was fixed, and when to
check again.

<!-- Entries are added by /improve — don't delete this section -->

### 2026-07-27 — Improvement pass (improve + code review + UI review)
- **Trigger:** User-initiated combined review; /improve audit was overdue (due 2026-06-19)
- **What was reviewed:** Full src/ code review (background agent), security, UI/first-impression clarity, tests, git hygiene, deps. Baseline healthy: clean tree, 75 tests, TSC clean, no secrets, design system correct.
- **What was fixed (9 items, 7 commits):**
  - **[P1] CSV formula injection** — exported report cells beginning with =,+,-,@ could execute in Excel; now neutralized with a leading apostrophe (plain negatives untouched). +6 tests.
  - **[P2] Rename-detection O(n²)** — B column value-sets rebuilt per iteration; now precomputed once.
  - **[P2] Silent export failures** — added catch handlers + inline error message.
  - **[P2] Missing key column in File B** — now warns instead of silently collapsing all rows.
  - **[P2] Duplicate-row warning count** — now reports rows dropped (agrees with excludedRowCount).
  - **[P2] Stale key auto-detect** — ColumnPicker re-runs detection when files change.
  - **[cleanup] Reordered column change** — removed misleading dead indices.
  - **[UI] Landing copy** — now states audience + stakes for the 30-second test.
  - **[UI] Example result card** + **mobile stacking** (verified no overflow at 375px).
- **Deferred / not touched:** SheetJS xlsx@0.18.5 CVEs (already an accepted, documented decision — client-side blast radius). Row-cap-after-parse (low value). Full real-file click-through QA (browser pane couldn't upload files this session).
- **OPEN QUESTION — blank-key matching:** The code review flagged that two unrelated all-blank-key rows (one in each file) get matched and reported as "modified." This is currently INTENTIONAL and encoded in differ.test.ts ("treats null/empty key values as empty-string key") with excludedRowCount as the honesty mitigation. NOT changed unilaterally. Decide next session: keep as-is, or make blank composite keys non-matchable (would rewrite that test).
- **Next review:** 2026-08-26 (30 days; project stable after this pass)

### 2026-05-22 — Improvement pass
- **Trigger:** First-ever /improve run (project was overdue)
- **What was reviewed:** Security (automated), code quality, dependencies, tests, docs, git hygiene
- **What was fixed:**
  - Fixed Excel serial date offset bug (off-by-one, was 25570 should be 25569)
  - Added 50MB file size limit on uploads
  - Added 200K row count cap to prevent UI freezes
  - Added magic-byte validation for XLSX files
  - Code-split SheetJS and ExcelJS into lazy-loaded chunks (1.5MB → 297KB initial bundle)
  - Error boundary now shows generic message, logs internals to console
  - Updated README from stub to full documentation
  - Documented SheetJS vulnerability acceptance in DECISIONS.md
- **Deferred:** SheetJS replacement (significant refactor, low practical risk for client-side tool)
- **Next review:** 2026-06-19
