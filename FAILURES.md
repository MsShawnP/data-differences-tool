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

### 2026-07-31 — Testing the decompression-bomb guard by round-tripping a huge-range XLSX hangs the writer

**Attempted:** To test the new parser cell-count cap, built a worksheet with
`XLSX.utils.aoa_to_sheet`, overrode `ws["!ref"]` to `"A1:XFD1048576"` (~17
billion cells), wrote it with `XLSX.write`, wrapped the buffer in a `File`, and
expected `parseFile` to reject it.

**Why it didn't work:** `XLSX.write` iterates the *declared* range to emit
cells, so the write side tried to materialize all 17 billion cells and froze —
the test timed out at 120s and node had to be killed. The guard I was testing
lives on the read side; the bomb never got there because the fixture couldn't
be written in the first place.

**What we tried instead:** Extracted the guard into a pure exported function
`assertDeclaredCellsWithinLimit(range, fileName)` and tested it directly with a
plain `{ s, e }` range object — no file, no XLSX round-trip, deterministic and
instant. General lesson: to test a guard against pathological input, call the
guard with the pathological *value*, don't try to manufacture a real artifact
that carries it.

**Status:** Resolved

**Tags:** sheetjs, xlsx, testing, dos, decompression-bomb, fixtures, timeout

---

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

---

### 2026-07-27 — `npm run deploy` (local wrangler) fails in the agent's non-interactive shell

**Attempted:** Ran `npm run deploy` (`npm run build && npx wrangler pages deploy dist`) to ship the CSV-injection fix.

**Why it didn't work:** The build succeeded, but wrangler aborted: "In a non-interactive environment, it's necessary to set a CLOUDFLARE_API_TOKEN." The agent's shell has no TTY, so wrangler can't run the interactive OAuth login and won't fall back to cached credentials.

**What we tried instead:** Pushed to `main` and let the GitHub Actions workflow (`deploy.yml`) build and deploy using the repo's Cloudflare secrets. Verified live: bundle hash `index-TFhJnsrF.js` served at diff.lailarallc.com. See DECISIONS.md "Deploy via git push."

**Status:** Resolved

**Tags:** deploy, wrangler, cloudflare, ci, non-interactive, github-actions

---

### 2026-07-28 — PowerShell here-string in the Bash tool corrupted a commit subject

**Attempted:** Passed a multi-line commit message to `git commit -m` using a
PowerShell here-string (`@'` … `'@`) from the Bash tool.

**Why it didn't work:** The Bash tool is Git Bash (POSIX sh), not PowerShell.
The `@'` delimiter is not shell syntax, so it was passed through as literal
text — the commit subject became `@` and the real headline dropped to line 2.

**What we tried instead:** Wrote the message to a file in the scratchpad and
used `git commit -F <file>`. Amended the bad commit the same way. This is now
the default for any commit message longer than one line.

**Status:** Resolved

**Tags:** git, commit, bash, powershell, here-string, tooling

---

### 2026-07-28 — Whitespace around a numeric CSV value does not trigger `wasNormalized`

**Attempted:** To verify the new "formatting normalized" tag in the browser,
fed File A a value of `" 200.00 "` against File B's `250`, expecting
`wasNormalized: true` because the raw text differs from the normalized form.

**Why it didn't work:** SheetJS parses ` 200.00 ` in a numeric CSV column into
the JS number `200`. By the time the differ sees it, `String(valA)` is already
`"200"` and equals the normalized value — so `wasNormalized` is correctly
false. The raw cell genuinely is numeric; the whitespace never survives parse.

**What we tried instead:** Used a date column (`2024-02-10` vs `2024-03-11`),
where SheetJS produces `Date` objects whose `String()` form differs from the
normalized `YYYY-MM-DD`. The tag rendered as expected.

**Side finding:** That same run exposed a real defect — date cells display as
raw `Date.toString()` output in the report and both exports. Logged in
PLAN.md, not fixed this session.

**Status:** Resolved (test approach); defect it exposed is open

**Tags:** sheetjs, normalization, dates, browser-verification, wasNormalized
