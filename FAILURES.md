# data-differences-tool — Failure Log

What was attempted that didn't work, why it didn't work, and what was
tried next.

Lower bar than DECISIONS.md — capture failures even when they didn't
produce a durable rule. The whole point: future-you (or future-Claude)
shouldn't re-attempt dead ends because the lesson got lost.

---

## Format

### YYYY-MM-DD — [One-line failure description]

**Attempted:** [What was tried]

**Why it didn't work:** [Concrete reason, not "it broke." If the
failure mode was technical, name the specific issue. If the failure
mode was scope or approach, name that.]

**What we tried instead:** [The next attempt, which may also have
failed and may have its own entry below]

**Status:** Resolved / open / abandoned

**Tags:** [keywords for future text-search — e.g., "rendering, pandoc,
quarto" or "scope, scrollytelling, decoration"]

---

## Entries

### 2026-05-22 — Excel serial date offset wrong since initial build, masked by self-referencing tests

**Attempted:** Used offset 25570 in `excelSerialToISO` to convert Excel date serial numbers to ISO date strings. Wrote tests that verified the output matched expectations.

**Why it didn't work:** The correct offset is 25569. Every XLSX date serial was off by one day. The tests passed because they were written by running the buggy code and using its output as the expected value — a circular validation. The bug was only caught by the /improve security audit which tested against a known external reference (Excel serial 44927 = Jan 1, 2023).

**What we tried instead:** Fixed offset to 25569, updated tests to use correct serial values (45306 = Jan 15, 2024 instead of 45307).

**Status:** Resolved

**Tags:** testing, excel, dates, circular-validation, offset

---

### 2026-05-22 — Date normalization with local time methods gives wrong day for UTC-parsed dates

**Attempted:** Fixed Date object normalization in `normalizer.ts` using `getFullYear()`/`getMonth()`/`getDate()` (local time methods) to extract calendar date from SheetJS Date objects.

**Why it didn't work:** SheetJS with `cellDates: true` parses ISO dates (`2024-01-15`) as UTC midnight. In EST (UTC-5), local time methods convert that to Jan 14 at 7pm — extracting the wrong calendar day. Meanwhile slash dates (`01/15/2024`) are parsed as local midnight, giving the correct local day. The inconsistency means local methods produce different outputs for the same intended date.

**What we tried instead:** Used UTC methods (`getUTCFullYear`/`getUTCMonth`/`getUTCDate`). Both parsing paths produce the correct UTC date for US timezones. Edge case remains for timezones east of UTC where slash-format local midnight falls on the previous UTC day, but this is acceptable for v1.

**Status:** Resolved

**Tags:** sheetjs, dates, timezone, normalization, cellDates
