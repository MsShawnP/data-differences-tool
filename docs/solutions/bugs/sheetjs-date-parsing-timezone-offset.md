---
title: "SheetJS date parsing produces timezone-dependent results across date formats"
date: 2026-05-22
last_updated: 2026-07-28
category: bugs
module: src/lib/normalizer.ts
problem_type: logic_error
component: tooling
symptoms:
  - "False 'modified' diffs when identical dates appear in different formats (ISO vs slash) across two files"
  - "Dates off by one day in negative-UTC timezones (e.g., Jan 15 becomes Jan 14 in EST)"
  - "Excel serial date conversion off by one day due to incorrect epoch offset (25570 vs 25569)"
  - "Recurred 2026-07-28: the string-fallback branch of the same function was still local-anchored 14 months after the fix"
root_cause: logic_error
resolution_type: code_fix
severity: high
tags:
  - sheetjs
  - date-parsing
  - timezone
  - utc
  - normalization
  - excel-serial-date
  - circular-validation
  - recurrence
---

# SheetJS date parsing produces timezone-dependent results across date formats

## Problem

SheetJS with `cellDates: true` produces Date objects with inconsistent timezone anchoring — ISO-format dates parse as UTC midnight while slash-format dates parse as local midnight — causing the normalizer to extract wrong calendar dates and report false "modified" diffs for identical dates.

## Symptoms

- Dates that are semantically identical but written in different formats (e.g., "2024-01-15" vs "01/15/2024") show as modified rows in the diff output
- The bug only manifests in timezones with negative UTC offsets (Americas), where UTC midnight rolls back to the previous calendar day in local time
- A secondary off-by-one error in `excelSerialToISO` shifted all XLSX serial dates by one day, but was masked by circular test validation

## What Didn't Work

- **Local time extraction (`getFullYear`/`getMonth`/`getDate`)** — The original broken approach. For UTC-parsed dates, local time methods in UTC-5 convert midnight Jan 15 UTC to 7pm Jan 14 local, extracting the wrong day.

- **`cellDates: false`** — CSV dates remained raw strings with SheetJS type "s", causing the column type detector to classify them as "text" rather than "date". The normalization pipeline never touched them. Fixing this would require building a separate date-column-detection system from format strings — added complexity with no benefit.

## Solution

**File:** `src/lib/normalizer.ts`

Replace local time methods with UTC equivalents for Date object normalization:

```typescript
// Before (broken):
if (val instanceof Date) {
  const y = val.getFullYear();
  const m = String(val.getMonth() + 1).padStart(2, '0');
  const d = String(val.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// After (correct):
if (val instanceof Date) {
  const y = val.getUTCFullYear();
  const m = String(val.getUTCMonth() + 1).padStart(2, '0');
  const d = String(val.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
```

Fix the Excel serial date offset:

```typescript
// Before: serial - 25570 (wrong)
// After: serial - 25569 (correct — accounts for Lotus 1-2-3 Feb 29, 1900 bug)
```

### 2026-07-28 — the same bug, second site, fourteen months later

`normalizeDate` has four branches. The May fix corrected the one that reproduced. Two others were already UTC-safe. The fourth — the string fallback for ISO-like values that no strict format matches — was still local-anchored, and stayed that way for fourteen months:

```typescript
// Before (broken since v1.0):
const fallback = dayjs(str);
if (fallback.isValid()) return fallback.format("YYYY-MM-DD");
// dayjs(str) resolves an instant; .format() renders it in the browser's local
// zone. "2024-01-15T02:00:00Z" normalized to 2024-01-14 for any user at a
// negative offset, so two timestamps a day apart in UTC could compare equal.

// After:
const fallback = dayjs.utc(str);
```

The strict-format loop above it was closed in the same pass. It was not producing wrong output — every entry in `DATE_FORMATS` is date-only, so parse-local and format-local cancel — but that is a property of the current format list, not of the code. It is now `dayjs.utc(str, fmt, true)` like the rest of the function.

**All four branches are now UTC-anchored: Excel serials, `Date` objects, strict-format strings, and the string fallback.**

## Why This Works

SheetJS stores all date-like cells as Date objects regardless of source format, but timezone anchoring differs by input format. UTC methods extract the correct calendar date from both paths:

- For ISO-parsed dates (UTC midnight): UTC methods directly return the intended calendar date.
- For slash-parsed dates (local midnight in US timezones): the UTC date is still the same calendar day because local midnight in negative-UTC zones is still the same UTC date (e.g., midnight EST = 05:00 UTC same day).

The serial offset fix (25569 not 25570) aligns with the Lotus 1-2-3 epoch: Excel intentionally treats 1900 as a leap year for backward compatibility, making Jan 1, 1970 = serial 25569.

**Open defect, tracked in PLAN.md section 9.** The slash-format reasoning above holds for negative UTC offsets only. East of UTC, a slash-format date that SheetJS parsed as local midnight falls on the *previous* UTC day (midnight Jan 15 in Tokyo is 15:00 Jan 14 UTC), so the `Date`-object branch can still extract the wrong calendar date there. That branch was not touched in the 2026-07-28 pass — only the two string branches were, and both are now UTC-anchored end to end (verified under `TZ=Asia/Tokyo`). Fixing it properly means not relying on SheetJS's timezone anchoring at all.

This sat in this doc as a caveat from 2026-05-22 ("acceptable for v1") and was never filed as work. It is now a PLAN.md item. A live defect recorded only in prose has the same half-life as a prevention rule written and never widened — see `docs/solutions/conventions/prevention-rules-are-scoped-to-the-surface.md`.

## Prevention

- **`normalizeDate` is UTC-anchored in every branch — Excel serials, `Date` objects, strict-format strings, and the string fallback.** Any comparison tool that discards the time component should use `getUTCFullYear`/`getUTCMonth`/`getUTCDate` for `Date` objects and `dayjs.utc()` for string parsing. Local methods are only correct when you know the value was constructed in local time AND you're extracting in the same timezone — which is never guaranteed for values that arrive from a user's file. The rule is scoped to the function, not to whichever branch last produced a wrong date.

- **A prevention rule inherits the blast radius of the repro unless you widen it deliberately.** The 2026-05-22 version of this rule said "default to UTC methods for date normalization" and named only the `Date`-object branch, because that is the branch that reproduced. The rule read as complete and was not — the string fallback in the same function violated it for fourteen months, with this doc sitting in the knowledge store the whole time. Scope every prevention rule to the function or surface, never to the input that reproduced. See `docs/solutions/conventions/prevention-rules-are-scoped-to-the-surface.md`.

- **Test date logic with timezone awareness.** A test that only passes in UTC is hiding a bug. Run date-related tests with `TZ=America/New_York` or equivalent to catch UTC/local drift.

- **Never validate constants by running the code under test.** The serial offset bug (25570) survived because tests used the buggy code's output as expected values. Derive test expectations from independent external references (Excel documentation, known-good conversion tables).

- **Document SheetJS parsing quirks at the call site.** The ISO-vs-slash timezone divergence is undocumented in SheetJS. A comment above `cellDates: true` prevents the next developer from reverting to local methods.

## Related Issues

- `docs/solutions/conventions/prevention-rules-are-scoped-to-the-surface.md` — the general rule this doc's own recurrence produced
- `docs/solutions/logic-errors/identical-verdict-ignored-column-changes.md` — same audit cycle, same shape: the fix landed on the surface that reproduced and not the one beside it
- FAILURES.md entry: "Excel serial date offset wrong since initial build, masked by self-referencing tests" (2026-05-22)
- FAILURES.md entry: "Date normalization with local time methods gives wrong day for UTC-parsed dates" (2026-05-22)
- DECISIONS.md entry: "Use UTC methods for Date normalization, keep cellDates: true" (2026-05-22)
