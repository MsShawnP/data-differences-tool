import type * as XLSXTypes from "xlsx";
import type { ColumnMetadata, ColumnType, ParsedFile } from "@/types";

let XLSX: typeof XLSXTypes;

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

  const columns = detectColumns(sheet);
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
 * Scans up to the first 100 data rows, using majority-vote
 * on SheetJS cell `.t` properties to determine each column's type.
 */
function detectColumns(sheet: XLSXTypes.WorkSheet): ColumnMetadata[] {
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1");
  const columns: ColumnMetadata[] = [];

  for (let col = range.s.c; col <= range.e.c; col++) {
    const headerCell = sheet[XLSX.utils.encode_cell({ r: range.s.r, c: col })];
    const name = headerCell ? String(headerCell.v) : `Column${col + 1}`;

    const typeCounts: Record<string, number> = {};
    let formatString: string | undefined;
    const maxScanRows = Math.min(range.e.r, range.s.r + 100);

    // Scan data rows (skip header row at range.s.r)
    for (let row = range.s.r + 1; row <= maxScanRows; row++) {
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
