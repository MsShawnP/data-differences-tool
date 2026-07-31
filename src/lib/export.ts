import type ExcelJSType from "exceljs";
import type { DiffResult, RowChange } from "@/types";
import { generateSummary } from "@/lib/summary-generator";
import { formatCellValue } from "@/lib/display";

let ExcelJS: typeof ExcelJSType;

async function getExcelJS() {
  if (!ExcelJS) {
    ExcelJS = (await import("exceljs")).default;
  }
  return ExcelJS;
}

interface ExportRow {
  key: string;
  changeType: string;
  column: string;
  oldValue: string;
  newValue: string;
  // "Yes" when the two values were compared after normalizing formatting
  // (whitespace, number format, date format). Blank otherwise. Disclosing this
  // keeps the report honest about what "different" means.
  normalized: string;
}

const EXPORT_HEADERS = ["Key", "Change Type", "Column", "Old Value", "New Value", "Normalized"];

function buildExportRows(result: DiffResult): ExportRow[] {
  const rows: ExportRow[] = [];

  for (const change of result.rowChanges) {
    const key = formatKey(change, result.keyColumnsUsed);

    if (change.type === "added") {
      rows.push({ key, changeType: "Added", column: "", oldValue: "", newValue: "", normalized: "" });
    } else if (change.type === "removed") {
      rows.push({ key, changeType: "Removed", column: "", oldValue: "", newValue: "", normalized: "" });
    } else if (change.type === "modified") {
      for (const cell of change.changes) {
        rows.push({
          key,
          changeType: "Modified",
          column: cell.column,
          oldValue: formatCellValue(cell.oldValue),
          newValue: formatCellValue(cell.newValue),
          normalized: cell.wasNormalized ? "Yes" : "",
        });
      }
    }
  }

  return rows;
}

function formatKey(change: RowChange, keyColumns: string[]): string {
  return keyColumns.map((col) => formatCellValue(change.keyValues[col])).join(" | ");
}

export async function exportToExcel(result: DiffResult): Promise<Blob> {
  const EJS = await getExcelJS();
  const workbook = new EJS.Workbook();

  // Sheet 1: Summary
  const summarySheet = workbook.addWorksheet("Summary");
  summarySheet.addRow(["Data Differences Report"]);
  summarySheet.addRow([]);
  summarySheet.addRow([generateSummary(result)]);
  summarySheet.addRow([]);
  summarySheet.addRow(["Metric", "Count"]);
  summarySheet.addRow(["Total rows (File A)", result.summary.totalRowsA]);
  summarySheet.addRow(["Total rows (File B)", result.summary.totalRowsB]);
  summarySheet.addRow(["Added rows", result.summary.addedCount]);
  summarySheet.addRow(["Removed rows", result.summary.removedCount]);
  summarySheet.addRow(["Modified rows", result.summary.modifiedCount]);
  summarySheet.addRow(["Unchanged rows", result.summary.unchangedCount]);
  summarySheet.addRow(["Duplicate/blank keys excluded", result.summary.excludedRowCount ?? 0]);
  summarySheet.addRow([]);
  summarySheet.addRow(["Key columns used", result.keyColumnsUsed.join(", ")]);

  summarySheet.getColumn(1).width = 20;
  summarySheet.getColumn(2).width = 15;

  // Sheet 2: Changes
  const changesSheet = workbook.addWorksheet("Changes");
  const headerRow = changesSheet.addRow(EXPORT_HEADERS);
  headerRow.font = { bold: true };

  const exportRows = buildExportRows(result);

  if (exportRows.length === 0) {
    changesSheet.addRow(["No row differences found", "", "", "", "", ""]);
  }

  const greenFill: ExcelJSType.FillPattern = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE4F5F0" },
  };
  const redFill: ExcelJSType.FillPattern = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFCE8E7" },
  };
  const yellowFill: ExcelJSType.FillPattern = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFDEEE0" },
  };

  for (const row of exportRows) {
    const excelRow = changesSheet.addRow([
      row.key,
      row.changeType,
      row.column,
      row.oldValue,
      row.newValue,
      row.normalized,
    ]);

    let fill: ExcelJSType.FillPattern | undefined;
    if (row.changeType === "Added") fill = greenFill;
    else if (row.changeType === "Removed") fill = redFill;
    else if (row.changeType === "Modified") fill = yellowFill;

    if (fill) {
      excelRow.eachCell((cell) => {
        cell.fill = fill;
      });
    }
  }

  changesSheet.getColumn(1).width = 20;
  changesSheet.getColumn(2).width = 14;
  changesSheet.getColumn(3).width = 18;
  changesSheet.getColumn(4).width = 25;
  changesSheet.getColumn(5).width = 25;
  changesSheet.getColumn(6).width = 12;

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function exportToCsv(result: DiffResult): Blob {
  const exportRows = buildExportRows(result);
  const lines: string[] = [EXPORT_HEADERS.map(escapeCsvField).join(",")];

  for (const row of exportRows) {
    lines.push(
      [row.key, row.changeType, row.column, row.oldValue, row.newValue, row.normalized]
        .map(escapeCsvField)
        .join(",")
    );
  }

  return new Blob([lines.join("\r\n") + "\r\n"], { type: "text/csv" });
}

// Prevent CSV formula/command injection. A cell whose text begins with =, +,
// -, @, tab, or CR can be executed as a formula when the report is opened in
// Excel or Sheets. Values come from untrusted input files, so prefix a lone
// apostrophe to force text — except plain numbers like "-100", which are safe
// and must not be mangled.
export function neutralizeFormula(value: string): string {
  if (/^[=+\-@\t\r]/.test(value) && !/^-?\d+(\.\d+)?$/.test(value)) {
    return `'${value}`;
  }
  return value;
}

export function escapeCsvField(value: string): string {
  const safe = neutralizeFormula(value);
  if (safe.includes(",") || safe.includes('"') || safe.includes("\n")) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
