---
date: 2026-05-16
topic: tabular-diff-tool
---

# Tabular Data Diff Tool

## Summary

A single-page React + TypeScript web app deployed to Cloudflare Pages where users upload two tabular files (CSV/XLSX), interactively select key columns or auto-detect them, and receive a structured diff report — with tolerant matching for real-world dirty data — viewable in-browser and downloadable as Excel or CSV.

---

## Problem Frame

People who work with recurring tabular data — analysts, consultants, ops, finance, auditors — constantly need to answer "what changed between these two files?" Line-based diff tools treat spreadsheets as text and produce noise. Excel's compare features are buried and unreadable. Manual reconciliation in pivot tables is slow, error-prone, and unrepeatable.

The pain is acute when files come from different people or systems: one export strips leading zeros, another reformats dates, a third adds whitespace. The user knows *something* changed but can't quickly see *what* without manually checking hundreds of rows.

The people who hit this are not developers. They won't install a CLI or learn a config file. They need a link that works immediately.

---

## Key Flows

- F1. Standard diff comparison
  - **Trigger:** User lands on the page with two files to compare
  - **Steps:**
    1. User reads brief instructions on the page
    2. User uploads File A and File B (drag-drop or file picker)
    3. App parses both files and displays column headers
    4. User selects key column(s) or clicks auto-detect
    5. App computes diff with tolerant matching
    6. App displays summary + structured report
    7. User reads report in-browser and/or downloads Excel/CSV
  - **Outcome:** User knows exactly what changed and has an artifact to share or act on

---

## Requirements

**File handling**
- R1. Accept CSV and XLSX file uploads via drag-and-drop or file picker
- R2. Handle mixed file types (one CSV, one XLSX) in the same comparison
- R3. Parse files client-side using SheetJS — no server round-trip
- R4. For XLSX files, diff the first/active sheet's data values (not formulas, formatting, or workbook structure)

**Key column selection**
- R5. After upload, display column headers from both files
- R6. User can interactively select one or more key columns
- R7. Auto-detect option that identifies likely key columns (columns named id, *_id, key, or the first column with all-unique values) and clearly shows what it chose
- R8. If auto-detect finds no candidate, prompt the user to select manually rather than guessing

**Diff computation**
- R9. Row-level diff: report rows added, removed, and modified (key-matched)
- R10. Modified rows show which columns changed with before/after values
- R11. Column-level diff: report columns added, removed, or reordered
- R12. Column-rename detection: when a column disappears from File A and a same-typed column with similar name + content appears in File B, flag as probable rename in the report
- R13. When files have different column sets, flag the differences and diff rows on the overlapping columns

**Tolerant matching**
- R14. Whitespace normalization (leading/trailing whitespace, multiple spaces)
- R15. Numeric equivalence: treat 12.00 and 12 as equal
- R16. Leading zero preservation awareness: "007" vs "7" flagged based on context (numeric column = same; text column = different)
- R17. Date format normalization: recognize common date formats and match across representations (2024-01-15 vs 01/15/2024 vs Jan 15, 2024)
- R18. Case-insensitive comparison option (off by default)

**Report output**
- R19. Template-based summary paragraph at the top: row counts (added/removed/modified), column counts, most common change pattern
- R20. Report structure: summary → column changes → row changes grouped by type
- R21. Modified rows show cell-level before/after values
- R22. Report is readable in-browser without downloading anything

**Download**
- R23. Download diff results as Excel file (primary format)
- R24. Download diff results as CSV (secondary option)
- R25. Downloads contain enough context to be useful standalone (column headers, key values, before/after)

**User experience**
- R26. Page is self-explanatory — a first-time user understands what to do without external documentation
- R27. Desktop-first layout (target users are at work, on laptops)
- R28. Drag-and-drop file upload with clear visual feedback
- R29. Processing feedback for files that take more than a moment to diff

---

## Acceptance Examples

- AE1. **Covers R14, R15.** Given File A has a row with value "  $12.00 " and File B has the same key with value "$12", when tolerant matching runs, this is reported as no change (whitespace stripped, numeric equivalence applied).
- AE2. **Covers R16.** Given a column of UPC codes (text context) where File A has "007891" and File B has "7891", when diffed, this is flagged as a change (leading zeros matter in text columns).
- AE3. **Covers R17.** Given File A has "2024-01-15" and File B has "01/15/2024" in a date column, when tolerant matching runs, this is reported as no change.
- AE4. **Covers R12.** Given File A has column "customer_name" and File B has column "client_name" with 90% content overlap, the report flags this as a probable rename rather than a removed + added column.
- AE5. **Covers R13.** Given File A has 12 columns and File B has 15 columns (10 in common), the report shows 2 columns removed, 5 columns added, and diffs the 10 overlapping columns for row changes.
- AE6. **Covers R7, R8.** Given a file with no column named id/*_id/key and no column with all-unique values, auto-detect declines and prompts the user to select a key column manually.

---

## Success Criteria

- A non-technical user can upload two files and understand the diff report without assistance
- The tool correctly identifies row and column changes on real-world files with formatting inconsistencies
- Someone receiving the link uses it rather than falling back to manual comparison
- The report is clear enough to forward to a colleague or client as-is
- Download produces an Excel file that opens cleanly and makes sense standalone

---

## Scope Boundaries

- No auth, user accounts, or saved state between sessions
- No LLM or AI-generated content
- No CLI interface
- No three-way merge or conflict resolution
- No database-to-database comparison
- No visual side-by-side diff panels (stretch goal, not v1)
- No diffing inside unstructured fields (JSON blobs, long text in cells) — flag as changed, don't parse
- No multi-sheet XLSX comparison — only the first/active sheet
- No server-side processing — all computation client-side
- No mobile optimization
- No saved configurations or reusable presets

---

## Key Decisions

- **Web app, not CLI:** Target users won't open a terminal. Adoption requires zero-friction browser access.
- **React + TypeScript:** UI has enough interactivity (column picker, structured report, download options) that a framework earns its keep. React ecosystem has proven libraries for every piece.
- **Client-side only:** File sizes (hundreds to thousands of rows) are well within browser capability. No server means zero cost, simpler deployment, and offline capability.
- **Template summary, not LLM:** Deterministic, always accurate, no API costs, no latency, no hallucination risk.
- **SheetJS for parsing:** Battle-tested XLSX/CSV library that runs in the browser.
- **Cloudflare Pages for hosting:** Already has an account. Free tier covers this. Avoids traffic-based billing risks.

---

## Dependencies / Assumptions

- SheetJS handles the CSV/XLSX formats these users encounter (standard exports from Excel, Google Sheets, and business systems)
- Files at hundreds-to-thousands of rows process fast enough in-browser that no Worker is needed
- Users have modern browsers (Chrome, Firefox, Edge — no IE11)

---

## Outstanding Questions

### Deferred to Planning

- [Affects R19][Technical] Exact template format for the summary paragraph — what patterns are worth auto-detecting beyond counts?
- [Affects R12][Needs research] Threshold for column-rename detection — what combination of name similarity + content overlap avoids false positives?
- [Affects R23][Technical] Library choice for Excel generation (ExcelJS, SheetJS write, or similar)
- [Affects R26][Design] Specific UI layout and component structure — how to present the report for maximum readability
- [Affects R14-R18][Technical] How to let users configure which tolerances apply (all-on by default with toggles? per-column settings?)
