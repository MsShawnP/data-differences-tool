import type * as XLSXTypes from "xlsx";
import type { ColumnMetadata, ColumnType, ParsedFile } from "@/types";

let XLSX: typeof XLSXTypes;

// A worksheet's declared range can be enormous even in a small (zip-compressed)
// file — a crafted "decompression bomb" .xlsx expands to hundreds of millions of
// cells. detectColumns and sheet_to_json would materialize all of them and
// freeze the tab. Reject any sheet whose declared range exceeds this before
// touching a single cell. 100M comfortably clears any real reconciliation file
// (the workflow's 200k-row cap with a normal column count is far below it) while
// stopping the multi-billion-cell pathological case.
const MAX_DECLARED_CELLS = 100_000_000;

/**
 * Throw if a worksheet's declared range would materialize more cells than we are
 * willing to process. Exported so the bomb guard can be unit-tested without
 * round-tripping a multi-gigacell workbook (which would freeze the writer too).
 */
export function assertDeclaredCellsWithinLimit(
  range: XLSXTypes.Range,
  fileName: string
): void {
  const declaredCells =
    (range.e.r - range.s.r + 1) * (range.e.c - range.s.c + 1);
  if (declaredCells > MAX_DECLARED_CELLS) {
    throw new Error(
      `File "${fileName}" is too large to process: it declares ` +
        `${declaredCells.toLocaleString()} cells (limit ` +
        `${MAX_DECLARED_CELLS.toLocaleString()}). This can indicate a corrupt ` +
        `or maliciously crafted spreadsheet.`
    );
  }
}

async function getXLSX() {
  if (!XLSX) {
    XLSX = await import("xlsx");
  }
  return XLSX;
}

/**
 * Parse a CSV or XLSX file into a normalized ParsedFile structure.
 * Uses SheetJS to handle both formats uniformly.
 * Only the first sheet is processed for multi-sheet workbooks.
 */
export async function parseFile(file: File): Promise<ParsedFile> {
  await getXLSX();
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: true,
    cellNF: true,
    sheets: 0,
  });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error(`File "${file.name}" contains no sheets.`);
  }

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`Could not read sheet "${sheetName}" from "${file.name}".`);
  }

  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1");
  assertDeclaredCellsWithinLimit(range, file.name);

  const columns = detectColumns(sheet, range);
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

  return {
    fileName: file.name,
    rows,
    columns,
    rowCount: rows.length,
  };
}

/**
 * Detect column headers and types from a sheet.
 * Scans every data row, reading SheetJS cell `.t` properties to
 * determine each column's type (see resolveColumnType).
 */
function detectColumns(
  sheet: XLSXTypes.WorkSheet,
  range: XLSXTypes.Range
): ColumnMetadata[] {
  const columns: ColumnMetadata[] = [];

  // Mirror SheetJS's sheet_to_json header-key generation so each column's
  // metadata name matches the key it produces on every row object. Blank
  // headers become __EMPTY / __EMPTY_1 / …; duplicate headers get _1, _2, …
  // suffixes. Naming a blank column "Column3" or leaving two "Name" columns
  // identical left the metadata name pointing at a key the rows never had
  // (__EMPTY / Name_1), so those columns silently never compared.
  const usedNames = new Map<string, number>();
  function uniqueHeaderKey(base: string): string {
    if (!usedNames.has(base)) {
      usedNames.set(base, 0);
      return base;
    }
    let counter = usedNames.get(base)!;
    let candidate: string;
    do {
      counter++;
      candidate = `${base}_${counter}`;
    } while (usedNames.has(candidate));
    usedNames.set(base, counter);
    usedNames.set(candidate, 0);
    return candidate;
  }

  for (let col = range.s.c; col <= range.e.c; col++) {
    const headerCell = sheet[XLSX.utils.encode_cell({ r: range.s.r, c: col })];
    const rawHeader = headerCell ? String(headerCell.v) : "";
    const name = uniqueHeaderKey(rawHeader === "" ? "__EMPTY" : rawHeader);

    const typeCounts: Record<string, number> = {};
    let formatString: string | undefined;

    // Scan every data row (skip header row at range.s.r). A 100-row sample
    // mistyped any column that is uniform through row 100 and mixed below it —
    // a text ID column that turns numeric partway down, say — and the type
    // drives normalization for the whole file. Cost is one lookup per cell,
    // the same order as the sheet_to_json pass that follows.
    for (let row = range.s.r + 1; row <= range.e.r; row++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = sheet[cellAddress] as
        | { t: "b" | "e" | "n" | "d" | "s" | "z"; z?: string }
        | undefined;

      if (!cell) continue;

      // Detect text-formatted columns via format string
      if (cell.z === "@") {
        formatString = "@";
      }

      const cellType = cell.t;
      typeCounts[cellType] = (typeCounts[cellType] ?? 0) + 1;
    }

    const detectedType = resolveColumnType(typeCounts, formatString);

    columns.push({
      name,
      detectedType,
      formatString,
      index: col,
    });
  }

  return columns;
}

/**
 * Resolve the final ColumnType from SheetJS cell type counts.
 *
 * SheetJS cell `.t` values:
 *   "n" = number, "d" = date, "s" = string, "b" = boolean, "e" = error
 *
 * Rules:
 * - If format string is "@" (text format), always return "text"
 * - If multiple types are present (mixed), return "text"
 * - Single dominant type maps to our ColumnType
 * - No data rows → "unknown"
 */
function resolveColumnType(
  typeCounts: Record<string, number>,
  formatString: string | undefined,
): ColumnType {
  if (formatString === "@") {
    return "text";
  }

  const types = Object.keys(typeCounts);

  if (types.length === 0) {
    return "unknown";
  }

  if (types.length > 1) {
    return "text";
  }

  const dominant = types[0]!;
  switch (dominant) {
    case "n":
      return "number";
    case "d":
      return "date";
    case "s":
      return "text";
    default:
      return "text";
  }
}
