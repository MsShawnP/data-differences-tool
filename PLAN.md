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
- [ ] Check mobile viewport (iPhone SE width minimum)
- [ ] Confirm fonts load (Playfair Display headings, Source Sans 3 body)

### 5. /improve audit-only
- [ ] Run /improve audit-only (was due 2026-06-19, deferred to next session)
- [ ] Fix any P0/P1 findings
- [ ] Log P2+ to backlog, don't block deploy

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
