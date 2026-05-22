# data-differences-tool — Current Work Plan

The current arc of work. Updated when the arc changes, not every
session. For session-by-session state, see HANDOFF.md.

---

## Goal

Ship a deployed web app where users upload two tabular files (CSV/XLSX),
pick key columns, and get a readable diff report — with tolerant matching
for real-world dirty data.

## Why this arc, why now

Universal pain point with no good existing tool at the consultant-grade
level. Directly demonstrates Lailara's data quality pitch. Users are
people Shawn hands the link to — it needs to work immediately and be
worth using.

## Business question this arc answers

What specifically changed between these two versions of this data,
explained in plain language anyone can act on?

## Scope (from /clarify — 2026-05-16)

**In scope (v1):**
- Single-page web app, no auth, no persistence
- Upload two files: CSV or XLSX
- Interactive key column picker + auto-detect option
- Row-level diff: added, removed, modified (with before/after values)
- Column-level diff: added, removed, renamed (heuristic), reordered
- Tolerant matching: whitespace normalization, numeric equivalence,
  leading zeros, date format normalization, case-insensitive option
- Mismatched schemas: flag column differences, diff the overlap
- Template-based summary paragraph (no LLM)
- In-browser readable report
- Download: Excel (primary), CSV (secondary)
- Self-explanatory page with instructions
- Deploy to Cloudflare Pages

**Out of scope (v1):**
- Auth / user accounts / persistence
- LLM-generated summaries
- CLI interface
- Three-way merge / conflict resolution
- Database-to-database diff
- Visual side-by-side diff panels
- Diffing unstructured fields (JSON blobs in cells)
- Schema migration generation
- Saved configs / scheduled diffs

## Tasks

[To be filled during /ce:brainstorm and /ce:plan]

## Definition of done for this arc

- [x] App deployed to Cloudflare Pages
- [x] Can upload two CSV files and see correct diff report
- [x] Can upload two XLSX files and see correct diff report
- [x] Can upload one CSV + one XLSX and diff them
- [x] Interactive key column picker works
- [x] Auto-detect key column works with clear indication of what it chose
- [x] Tolerant matching handles: whitespace, 12.00 vs 12, leading zeros,
      date formats
- [x] Mismatched columns flagged correctly
- [x] Template summary paragraph is accurate
- [x] Excel download works and is usable
- [x] CSV download works
- [x] Page is self-explanatory to non-technical user
- [x] Worth handing someone a link to

---

## Arc history

When an arc completes, archive its goal, completion date, and outcome
here. Then start a new arc above. Provides continuity without bloating
the active plan.

### [Date completed] — [Goal]
- Outcome: [what shipped or what was decided]
- Tag: [git tag if one was created]

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
