# data-differences-tool — Handoff Log

Session-by-session state. Updated by /log mid-session and /wrap at
session end.

For durable choices, see DECISIONS.md.
For the current work arc, see PLAN.md.
For things that didn't work, see FAILURES.md.

---

## 2026-07-29 16:01 — /wrap

**Started from:** The 18:56 stop point below, everything committed but two
commits unpushed.

**Did:** Confirmed the push and deploy landed between sessions — local HEAD =
remote HEAD = `05d78be`, deploy run at 2026-07-28T23:18 succeeded. Verified the
live bundle (`index-r-eoM4Oq.js`) contains both the identical-verdict fix
("No row values changed") and the display fix (`getUTCHours`). Added a
DECISIONS.md entry recording that display formatting is a separate concern from
normalization.

**State:** v1.1 polish arc effectively complete. Tree clean, 100 tests, tsc +
build clean, all fixes live at diff.lailarallc.com. FAILURES.md and DECISIONS.md
current. Nothing unpushed after this entry commits.

**Next:** PLAN.md task 9 — east-of-UTC dates in the `Date`-object branch of
`normalizeDate`. Last non-UTC-safe branch; display inherits its exposure by
design, so fixing 9 moves screen/exports/summary together. Add a
`TZ=Asia/Tokyo` case with the fix. Do NOT open the currency/money arc (task 8)
without flagging — it is a feature, out of the v1.1 polish scope.

---

## 2026-07-28 18:56 — STOPPED HERE

**Started from:** The 18:00 wrap entry below. Session continued past it with a
`/ce-compound` pass, a `/ce-compound-refresh`, and a date-display fix.

**Did (after the 18:00 wrap):**
- `93eea80` — wrote `docs/solutions/logic-errors/identical-verdict-ignored-column-changes.md`; widened the `docs/solutions/` line in CLAUDE.md
- `3eadc58` — UTC-anchored the strict-format branch of `normalizeDate`, the last local-anchored one
- `4fd59ba` — refreshed the SheetJS date doc; created the prevention-rule-scoping convention
- `de2437a` — moved that convention to portfolio root; filed the Tokyo defect as PLAN.md task 9
- `16537dd` — **UNPUSHED.** `src/lib/display.ts` + `formatCellValue`, replacing `String(cell.value)` in RowChanges.tsx, export.ts, and summary-generator.ts. Closes PLAN.md task 10.

**State:** Tree clean. 100 tests pass, tsc clean, build clean, verified under
both `TZ=America/New_York` and `TZ=Asia/Tokyo`. One commit (`16537dd`) is
committed locally but NOT pushed and NOT deployed — deliberate, the session was
stopped before either. Everything through `de2437a` is live.

Note: a stale zero-byte `.git/index.lock` blocked the first commit attempt (no
git process was running). Removed it and the commit went through. Mentioning it
only so a `.git` oddity later isn't a mystery.

**Next — one step, in order:**
1. `git push` from this repo. That triggers `.github/workflows/deploy.yml` and
   ships `16537dd` to diff.lailarallc.com. Verify after: the live bundle hash
   should change, and `curl -s https://diff.lailarallc.com/assets/index-*.js`
   should contain `formatCellValue`'s output shape. Nothing else is pending.
2. Then the next real piece of work is PLAN.md task 9 (east-of-UTC dates in the
   `Date`-object branch of `normalizeDate`). It is the last non-UTC-safe branch
   and display now inherits its exposure by design.

**Do not** start the currency/money arc (PLAN.md task 8, product gap) without
saying so — it is a feature and out of scope for the v1.1 polish arc.

**Cross-repo work from this session, both already pushed, nothing pending:**
- `reference/prevention-rule-scoping.md` — new portfolio-level convention
- `reference/lailara-design-system/CSS_TOKEN_AUDIT.md` — new (`24b1f48`)
- `sku-rationalization-framework` — CSS convention replaced with a pointer
- `~/.claude/CLAUDE.md` — one line under "Best practices baked in" pointing at
  the scoping rule
- `~/.claude/commands/wrap.md` — new required **Sibling surfaces** field in the
  session summary, a rule enforcing it, and a Step 2 clause requiring an
  unfixed sibling to become a tracked item

---

## 2026-07-28 18:00

**Started from:** v1.1 polish arc, clean tree, app live. A Tier C review list
arrived with 8 findings; PLAN.md task 7 already held the `it.fails`-pinned
critical one.

**Did:** Fixed 7 of 8 findings across 8 commits — identical-verdict column
gate (un-pins both `it.fails` tests), tolerant-matching wording,
`wasNormalized` surfaced on screen and in both exports, UTC date fallback,
full-column type detection, footer color token, README/CLAUDE.md corrections.
Pushed and verified live. Bumped CI to actions v5 + Node 24.

**State:** 90 tests, tsc + build clean, tree clean, everything pushed and
deployed (bundle `index-g1KV10e-.js` verified live). Untouched: money/currency
product gap, blank-key matching question.

**Next:** Fix date cells rendering as raw JS `Date` strings — a 2024-02-10 date
displays as "Fri Feb 09 2024 19:00:00 GMT-0500" in RowChanges.tsx:95 and
export.ts:38. Normalize to `YYYY-MM-DD` for display. Then decide whether to
open a currency-totals arc.

---

## 2026-07-28 15:56

**What changed:** Fixed the Tier C review list — 6 commits: identical-verdict
column gate (un-pins the two `it.fails` tests), tolerant-matching wording,
`wasNormalized` surfaced in the UI and both exports, UTC date fallback,
full-column type detection, footer color token, README/CLAUDE.md corrections.

**Why:** The identical verdict shipped a false sentence to screen and Excel
when only columns changed. The rest were honesty and accuracy gaps found in
the same review.

**State:** 90 tests pass, tsc + build clean, tree clean, 6 commits unpushed.
Verified in the browser: column-only summary sentence, "formatting normalized"
tag, footer at #595959. Not touched: the money/currency product gap (new arc,
out of v1.1 scope).

**Next:** Decide on two open items — (1) open an arc for currency-column money
totals; (2) fix date cells rendering as raw JS Date strings ("Fri Feb 09 2024
19:00:00 GMT-0500" for a 2024-02-10 date) in RowChanges.tsx:95 and export.ts:38.

---

## 2026-07-27

**Started from:** v1.1 polish arc, /improve audit overdue (due 2026-06-19). Clean tree, app live.

**Did:** Ran improve + full code review + UI review. Fixed 9 findings (8 commits): CSV formula-injection neutralization (+6 tests), rename-detection O(n²) fix, missing-key/duplicate-count warnings, silent-export-failure handling, stale auto-detect fix, dead reordered-data removal, landing copy for 30s clarity, example-result card, mobile stacking. Deployed via `git push` → GitHub Actions (local wrangler failed non-interactively).

**State:** All fixes committed, pushed, deployed, verified live (bundle `index-TFhJnsrF.js`). 82 tests pass, TSC + build clean. Tree clean.

**Next:** Decide the blank-key matching question (PLAN.md Improvement History): keep intentional behavior or make blank composite keys non-matchable (rewrites one test). Optional: real-file click-through QA; OG link-preview spot-check.

---

## 2026-06-23

**Started from:** v1.0 complete, no active arc. Last session 2026-05-22. /improve audit overdue. Clean tree.

**Did:** Started v1.1 arc (executive-ready polish). Added SVG+ICO favicon, HTML meta tags (title, description, OG, Twitter card), "Built by Lailara LLC" footer. Verified via preview server. Deployed to Cloudflare Pages. Pushed to GitHub.

**State:** v1.1 partially complete. Favicon, meta tags, footer live at diff.lailarallc.com. Apple-touch-icon PNG deferred. /improve audit deferred. Full click-through QA not done.

**Next:** Spot-check OG preview on live site (metatags.io). Run /improve audit-only. Full click-through QA with real files. Generate apple-touch-icon PNG if desired.

---

## 2026-05-22 16:30

**Started from:** App deployed with /improve fixes. Needed to evaluate subjective definition-of-done items and close the v1.0 arc.

**Did:** Evaluated UX, added auto-detect key column on mount + explanatory copy, redeployed, checked off all 12/12 items, archived v1.0 arc, ran /ce:compound (first solution doc written to docs/solutions/bugs/).

**State:** v1.0 complete. Live at https://diff.lailarallc.com/. 70 tests, 297KB bundle. No active arc.

**Next:** No active work arc. Options: start v1.1 arc, run /improve audit-only when due (2026-06-19), or move to a different project.

---

## 2026-05-22 16:00

**Started from:** App deployed but definition-of-done items unverified.

**Did:** Tested all features (CSV, XLSX, mixed, tolerant matching, downloads, mismatched columns). Fixed date normalization bug. Ran first /improve pass: fixed 8 findings (Excel serial offset, file size limit, row cap, magic-byte validation, code-splitting, error boundary, README, SheetJS docs). Redeployed.

**State:** All functional features verified. Live at https://diff.lailarallc.com/. 70 tests pass, 297KB initial bundle. 10/12 definition-of-done checked. Need to redeploy with /improve fixes.

**Next:** Redeploy with /improve fixes. Evaluate two subjective items ("self-explanatory", "worth sharing"). If satisfied, mark arc complete. Run /ce:compound.

---

## 2026-05-22 15:45

**Started from:** App deployed and code-reviewed but definition-of-done items not verified.

**Did:** Tested all features (CSV, XLSX, mixed format, tolerant matching, downloads, mismatched columns). Fixed date normalization bug (SheetJS UTC vs local parsing). Redeployed to Cloudflare Pages. Checked off 10/12 definition-of-done items.

**State:** All functional features verified. Live at https://diff.lailarallc.com/ with date fix. 70 tests pass. Remaining 2 items are subjective UX judgments.

**Next:** Evaluate "self-explanatory" and "worth sharing" items on live site. If satisfied, mark arc complete. Consider /improve or /ce:compound.

---

## 2026-05-22 15:40

**What changed:** Verified mismatched columns (added/removed/renamed all flagged correctly). Redeployed to Cloudflare Pages with date normalization fix. 10/12 definition-of-done items checked off.

**Why:** Completing feature verification and shipping the date fix to production.

**State:** Live at https://diff.lailarallc.com/ with all fixes. Remaining unchecked items are subjective (self-explanatory page, worth sharing). All functional features verified.

**Next:** Evaluate the two subjective definition-of-done items. Consider running /improve or /ce:compound.

---

## 2026-05-22 15:35

**What changed:** Verified all major features — XLSX upload, mixed format diff, Excel/CSV download all working. Checked off 9/12 definition-of-done items in PLAN.md.

**Why:** Completing verification of features that couldn't be tested last session. XLSX and download were the remaining unknowns.

**State:** All core features verified. Remaining unchecked items: mismatched columns test, page self-explanatory (subjective), worth sharing (subjective). Date normalization fix from earlier this session is working.

**Next:** Test mismatched columns scenario. Consider redeploying with the date fix. Evaluate UX for the two subjective items.

---

## 2026-05-22 15:28

**What changed:** Fixed date normalization bug — added UTC-based Date object handler in normalizer.ts. Tested all tolerant matching features in browser.

**Why:** SheetJS parses ISO dates as UTC and slash dates as local time, causing identical calendar dates to show as different. Broke tolerant matching for date format normalization.

**State:** All features verified via browser testing: CSV upload, auto-detect key, diff report, row expansion, tolerant matching (whitespace, numeric, leading zeros, dates). 70 tests pass. XLSX upload and file download not yet tested with real files.

**Next:** Test XLSX file upload manually. Test Excel/CSV download. Check off PLAN.md definition-of-done items.

---

## 2026-05-16 19:49

**Started from:** App deployed but not code-reviewed.

**Did:** Ran /ce:review (10 reviewers), fixed all 16 findings (P0–P3), merged to main, redeployed to Cloudflare Pages.

**State:** App live at https://diff.lailarallc.com/ with all fixes. 70 tests pass, TypeScript clean. PLAN.md definition-of-done items not yet checked off (XLSX, tolerant matching, mixed format).

**Next:** Test XLSX upload and tolerant matching edge cases. Check off definition-of-done items. Add tests for renamed-column diffing path.

---

## 2026-05-16 19:18

**What changed:** Fixed all 16 code review findings — correctness, type safety, UX, and state management across 12 files.

**Why:** /ce:review found P0–P3 issues: differ skipped renamed columns, duplicate keys were silent, RowChange type was unsafe, pagination missing, no error boundary. All needed fixing before the code is shippable.

**State:** App deployed and verified. All 70 tests pass, TypeScript clean, browser workflow correct (upload → auto-detect → diff → export). Branch `claude/wizardly-vaughan-4afe26` has fixes committed but not yet merged to main.

**Next:** Push branch and merge to main. Then check PLAN.md definition-of-done items (XLSX upload testing, tolerant matching edge cases).

---

## 2026-05-16 22:55 — Visual QA passed, fonts loaded, deployed to Cloudflare Pages

**Started from:** Code feature-complete (13 units, 70 tests) but never browser-tested or deployed. Fonts not loaded.

**Did:**
- Full visual QA: upload → auto-detect key columns → diff → expanded rows → export → reset
- Installed @fontsource-variable packages for Playfair Display + Source Sans 3
- Authenticated with Cloudflare, created Pages project, deployed
- Live at https://diff.lailarallc.com/

**State:** App deployed and fully functional. All core features verified, fonts rendering correctly, zero console errors. XLSX upload and tolerant matching edge cases not explicitly tested yet.

**Next:** Run /ce:review for code review. Test XLSX upload and tolerant matching (whitespace, numeric equivalence, leading zeros, date formats). Check definition-of-done items in PLAN.md.

---

## 2026-05-16 18:05 — All 13 implementation units complete

**Started from:** Empty scaffold.

**Did:**
- Ran full workflow: /clarify → /ce:brainstorm → /ce:plan → /ce:work
- Built all 13 units of the implementation plan on `feat/tabular-diff-app`
- Library layer (6 modules, 70 tests passing):
  - `src/lib/parser.ts` — SheetJS CSV/XLSX parsing with type detection
  - `src/lib/normalizer.ts` — whitespace, numeric, date, case normalization
  - `src/lib/column-detector.ts` — rename detection + key auto-detection
  - `src/lib/differ.ts` — Map-based row join, three-pass comparison
  - `src/lib/summary-generator.ts` — template paragraph from DiffResult
  - `src/lib/export.ts` — styled Excel (ExcelJS) + CSV
- UI layer (7 components):
  - `src/components/FileUpload.tsx` — react-dropzone dual zone
  - `src/components/ColumnPicker.tsx` — key selection + auto-detect
  - `src/components/DiffReport.tsx` — report container
  - `src/components/DiffSummary.tsx` — stat summary
  - `src/components/ColumnChanges.tsx` — added/removed/renamed columns
  - `src/components/RowChanges.tsx` — paginated expandable row diffs
  - `src/components/DownloadOptions.tsx` — Excel + CSV download buttons
- Orchestration:
  - `src/hooks/use-diff-workflow.ts` — useReducer state machine
  - `src/App.tsx` — wires all components into workflow flow

**State:** Feature-complete but NOT yet visually verified or deployed.
Build succeeds. 70 tests pass. TypeScript clean.

**Not done:**
- Visual testing in browser (preview tool was bound to wrong project)
- Cloudflare Pages deployment
- Lailara design system fonts (Playfair Display, Source Sans 3) not yet loaded

**Next session:**
1. `npm run dev` — test the full flow with real CSV/XLSX files
2. Fix any visual/UX issues
3. Load design system fonts (self-hosted woff2)
4. Deploy: `npm run deploy`
5. Verify live URL works

**Branch:** `feat/tabular-diff-app` (8 commits ahead of main)

---

## 2026-05-16 17:13 — Project initialized

**Started from:** New project setup.

**Did:** Created repo, set up CLAUDE.md/DECISIONS.md/HANDOFF.md/PLAN.md/
FAILURES.md. Running /clarify to scope the web app.

**State:** Foundation in place. Clarify interview in progress.

**Next:** Complete /clarify, then /ce:brainstorm to spec the tool.

---
