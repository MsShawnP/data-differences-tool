---
title: "Diff summary claimed files were identical when only the columns changed"
date: 2026-07-28
category: logic-errors
module: src/lib/summary-generator.ts
problem_type: logic_error
component: tooling
symptoms:
  - "A file that gained a column but changed no row value reported 'Files are identical. No differences found.'"
  - "The same false sentence was written to the Excel Summary sheet, so the downloadable report carried it too"
  - "The Column Changes panel simultaneously displayed the added column, contradicting the verdict above it"
  - "No test could reach the state — the test factory hardcoded columnChanges as an empty array"
root_cause: logic_error
resolution_type: code_fix
severity: critical
tags:
  - summary-generation
  - verdict
  - false-negative
  - test-factory-blind-spot
  - xfail
  - tolerant-matching
---

# Diff summary claimed files were identical when only the columns changed

## Problem

`generateSummary()` decided "no differences" from three numbers — added, removed, and modified row counts — and never consulted `columnChanges`. A file that gained, lost, renamed, or reordered a column while every row value stayed put produced "Files are identical. No differences found." The tool's single most important sentence was false, on screen and in the exported Excel report.

## Symptoms

- Upload File A (`id,name,amount`) and File B (`id,name,amount,discount`) with identical row values → verdict reads "Files are identical. No differences found."
- The Column Changes panel directly below the verdict listed `added: discount` — the UI contradicted itself in one viewport.
- `exportToExcel` writes `generateSummary(result)` verbatim into the Summary sheet, so the false claim shipped in the artifact a reader opens away from the app.
- The entire summary-generator test file passed. `makeDiffResult()` hardcoded `columnChanges: []`, so no test could construct the failing state.

## What Didn't Work

- **Treating row counts as a proxy for "any difference."** The original gate — `addedCount === 0 && removedCount === 0 && modifiedCount === 0` — reads as a complete check but only covers row-level change. Schema change is a second, independent axis the gate never saw.

- **Patching one hole and trusting the verdict again.** An earlier pass found that duplicate and blank keys silently drop rows from comparison, and added `excludedRowCount` plus a hedged sentence for that case. That fix made the verdict *look* audited without widening what it audits, so the column hole survived a review that was specifically about verdict honesty.

- **Relying on the test suite to surface it.** The gap was invisible from inside the tests: a shared factory that hardcodes a field removes that field from the space of states any test can express. Reading the tests would not have found this; only reading the factory would.

- **Fixing the wording without fixing the gate.** "Files are identical" was independently wrong (see *Why This Works*), but changing only the sentence would have left a file with a new column still reporting no differences.

## Solution

**Files:** `src/lib/summary-generator.ts`, `src/lib/export.ts` (via the shared call), `tests/lib/summary-generator.test.ts`

```typescript
// Before — columnChanges is not even destructured
const { summary, rowChanges } = result;
if (addedCount === 0 && removedCount === 0 && modifiedCount === 0) {
  if (excludedRowCount === 0) {
    return "Files are identical. No differences found.";
  }
  // ...
}

// After
const { summary, rowChanges, columnChanges } = result;
if (addedCount === 0 && removedCount === 0 && modifiedCount === 0) {
  const columnClause = describeColumnChanges(columnChanges); // "" when columns match
  if (excludedRowCount === 0) {
    if (columnClause) {
      return `No row values changed. ${columnClause}`;
    }
    return "No material differences after tolerant matching. Every row matched on the key columns and every compared value is equivalent.";
  }
  const excludedSentence = `No differences among the compared rows, but ${excludedRowCount} row…`;
  return columnClause ? `${excludedSentence} ${columnClause}` : excludedSentence;
}
```

`describeColumnChanges()` covers all four `ColumnChangeType` values and produces sentences like `1 column added: discount.` / `1 column renamed: qty → quantity.` / `Columns reordered.`

Because `exportToExcel` calls `generateSummary(result)`, the Excel Summary sheet was fixed by the same change — no second edit, and no chance of the two drifting.

The defect had been pinned in advance with vitest's strict xfail, which is what forced the fix to be complete:

```typescript
// Suite stays green while the bug is live, and FAILS the moment the gate is
// fixed — so the marker cannot silently outlive the defect.
it.fails("does not claim identical when a column was added but no row changed", () => {
  const result = makeDiffResult({ columnChanges: [{ type: "added", columnName: "discount" }] });
  expect(generateSummary(result)).not.toBe("Files are identical. No differences found.");
});
```

## Why This Works

Two independent errors sat in the same four lines.

**The gate was incomplete.** `DiffResult` carries two kinds of difference — `rowChanges` and `columnChanges` — and the verdict consulted one. Reading `columnChanges` closes the gap structurally rather than adding another special case: any schema change now produces a clause, and the "nothing changed" sentence is only reachable when both axes are empty.

**The remaining sentence still overclaimed.** Even with zero row *and* zero column changes, this tool cannot assert the files are identical. It normalizes whitespace, number formatting, and date formats away before comparing; it matches rows on key columns only; it excludes duplicate- and blank-key rows. "No material differences after tolerant matching" is the strongest claim the method supports. The verdict now describes what was checked instead of asserting a property that was never tested.

## Prevention

- **A verdict may only claim what the method measured.** Before writing a summary sentence, enumerate every input the conclusion depends on and confirm the code reads all of them. Here the conclusion depended on `rowChanges` *and* `columnChanges`; the code read one. Recorded as a project rule in DECISIONS.md — "Never tell the user the files are identical."

- **Audit test factories, not just tests.** A shared `makeX()` helper that hardcodes a field defines the boundary of what the suite can ever detect. When reviewing coverage for a module, read the factory first and ask which fields are frozen. Every frozen field is an untestable state.

- **Pin a known defect with `it.fails` rather than a comment or a TODO.** Vitest treats `it.fails` as strict xfail: the suite passes while the bug is live and *fails* the moment the behavior is fixed, forcing the marker off in the same commit. A skipped test or a TODO can outlive the defect silently; this cannot.

- **Fix shared output paths at the source.** The Excel report was wrong because it reused the summary function. That coupling made the bug wider but the fix narrower — one edit corrected both surfaces. Prefer a single generator over per-surface copies of user-facing prose. See DECISIONS.md — "The download must disclose everything the screen discloses."

- **The guard that stopped the search.** This is the failure mode worth naming, because it is not a plain miss and it is harder to catch than one. A partial fix that raises *apparent* rigor is worse than no fix at all: the next reviewer sees a guard, reads it as evidence the area was audited, and moves on. The `excludedRowCount` hedge was added precisely because the verdict had been found untrustworthy — and it is why the column hole then survived a review whose stated subject was verdict honesty. The guard is what stopped the search.

  As a review heuristic: **when you find a guard, check what it doesn't guard.** Its existence is the reason the last person stopped looking. Adding a hedge is the moment to ask what *else* the conclusion ignores, not the moment to declare the conclusion fixed. See `docs/solutions/conventions/prevention-rules-are-scoped-to-the-surface.md`.

## Related Issues

- `docs/solutions/conventions/prevention-rules-are-scoped-to-the-surface.md` — the general rule, and the home of the guard heuristic above
- `docs/solutions/bugs/sheetjs-date-parsing-timezone-offset.md` — same audit cycle, same shape one layer up: its prevention rule named the `Date`-object branch that reproduced, and the string fallback in the same function stayed broken for fourteen months. Refreshed 2026-07-28; the rule is now scoped to the whole function.
- PLAN.md section 7 — the `it.fails` pin and the instruction not to remove a marker without doing the fix.
- PLAN.md section 8 — the full Tier C review list this fix came from.
- DECISIONS.md — "Never tell the user the files are identical" (2026-07-28), "The download must disclose everything the screen discloses" (2026-07-28).
