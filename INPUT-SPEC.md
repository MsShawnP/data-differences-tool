# INPUT-SPEC — data-differences-tool (client mode)

Client mode for this tool is **browser-local**: two client files are compared entirely in the
browser and **nothing is uploaded anywhere**. There is no server, no engagement config, and no
provenance footer to generate — the confidentiality guarantee is that the data never leaves the
client's machine.

## The two files

- **CSV or XLSX**, one "before" and one "after". Parsed client-side with SheetJS.
- Any columns; the tool auto-detects matched, renamed, added, and removed columns.
- One or more **key columns** identify a row across the two files (chosen in the UI; defaults
  to the first column). Rows are matched by key, then compared cell-by-cell.

## What it reports

Added rows, removed rows, modified rows (with per-cell before/after), and column-level changes
(renames, adds, drops). Case sensitivity and numeric tolerance are configurable. Results export
to a styled XLSX — also built client-side.

## Confidentiality (the client-mode contract)

- **No network calls with files loaded.** The diff pipeline touches no `fetch`, `XMLHttpRequest`,
  `WebSocket`, or `navigator.sendBeacon`. This is enforced permanently by
  `tests/lib/no-network.test.ts`, which spies on every network primitive, runs the full diff,
  and asserts none is called.
- **Nothing is uploaded, stored, or logged.** File contents exist only in the browser tab for the
  duration of the comparison.
- The demo output is locked by `tests/lib/demo-golden.test.ts` so the deployed experience can't
  drift.

## Run (local, no upload)

Open the deployed page (or `npm run dev`), drop the two files in, pick the key column(s), and
compare. Because everything runs in the browser, the same page a prospect uses is the client-mode
tool — a client can run it on their own machine with their own data and nothing leaves it.

```
npm run dev     # local dev server
npm test        # 115 Vitest tests incl. the no-network guarantee
```
