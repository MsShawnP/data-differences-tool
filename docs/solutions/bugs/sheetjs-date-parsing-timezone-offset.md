---
title: "SheetJS date parsing produces timezone-dependent results across date formats"
date: 2026-05-22
category: bugs
module: src/lib/normalizer.ts
problem_type: logic_error
component: tooling
symptoms:
  - "False 'modified' diffs when identical dates appear in different formats (ISO vs slash) across two files"
  - "Dates off by one day in negative-UTC timezones (e.g., Jan 15 becomes Jan 14 in EST)"
  - "Excel serial date conversion off by one day due to incorrect epoch offset (25570 vs 25569)"
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

## Why This Works

SheetJS stores all date-like cells as Date objects regardless of source format, but timezone anchoring differs by input format. UTC methods extract the correct calendar date from both paths:

- For ISO-parsed dates (UTC midnight): UTC methods directly return the intended calendar date.
- For slash-parsed dates (local midnight in US timezones): the UTC date is still the same calendar day because local midnight in negative-UTC zones is still the same UTC date (e.g., midnight EST = 05:00 UTC same day).

The serial offset fix (25569 not 25570) aligns with the Lotus 1-2-3 epoch: Excel intentionally treats 1900 as a leap year for backward compatibility, making Jan 1, 1970 = serial 25569.

## Prevention

- **Default to UTC methods for date normalization.** Any comparison tool that discards the time component should use `getUTCFullYear`/`getUTCMonth`/`getUTCDate`. Local methods are only correct when you know the Date was constructed in local time AND you're extracting in the same timezone.

- **Test date logic with timezone awareness.** A test that only passes in UTC is hiding a bug. Run date-related tests with `TZ=America/New_York` or equivalent to catch UTC/local drift.

- **Never validate constants by running the code under test.** The serial offset bug (25570) survived because tests used the buggy code's output as expected values. Derive test expectations from independent external references (Excel documentation, known-good conversion tables).

- **Document SheetJS parsing quirks at the call site.** The ISO-vs-slash timezone divergence is undocumented in SheetJS. A comment above `cellDates: true` prevents the next developer from reverting to local methods.

## Related Issues

- FAILURES.md entry: "Excel serial date offset wrong since initial build, masked by self-referencing tests" (2026-05-22)
- FAILURES.md entry: "Date normalization with local time methods gives wrong day for UTC-parsed dates" (2026-05-22)
- DECISIONS.md entry: "Use UTC methods for Date normalization, keep cellDates: true" (2026-05-22)
