import type ExcelJSType from "exceljs";
import type { DiffResult, RowChange } from "@/types";
import { generateSummary } from "@/lib/summary-generator";

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
}

function buildExportRows(result: DiffResult): ExportRow[] {
  const rows: ExportRow[] = [];

  for (const change of result.rowChanges) {
    const key = formatKey(change, result.keyColumnsUsed);

    if (change.type === "added") {
      rows.push({ key, changeType: "Added", column: "", oldValue: "", newValue: "" });
    } else if (change.type === "removed") {
      rows.push({ key, changeType: "Removed", column: "", oldValue: "", newValue: "" });
    } else if (change.type === "modified") {
      for (const cell of change.changes) {
        rows.push({
          key,
          changeType: "Modified",
          column: cell.column,
          oldValue: String(cell.oldValue ?? ""),
          newValue: String(cell.newValue ?? ""),
        });
      }
    }
  }

  return rows;
}

function formatKey(change: RowChange, keyColumns: string[]): string {
  return keyColumns.map((col) => String(change.keyValues[col] ?? "")).join(" | ");
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
  summarySheet.addRow([]);
  summarySheet.addRow(["Key columns used", result.keyColumnsUsed.join(", ")]);

  summarySheet.getColumn(1).width = 20;
  summarySheet.getColumn(2).width = 15;

  // Sheet 2: Changes
  const changesSheet = workbook.addWorksheet("Changes");
  const headers = ["Key", "Change Type", "Column", "Old Value", "New Value"];
  const headerRow = changesSheet.addRow(headers);
  headerRow.font = { bold: true };

  const exportRows = buildExportRows(result);

  if (exportRows.length === 0) {
    changesSheet.addRow(["No differences found", "", "", "", ""]);
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

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function exportToCsv(result: DiffResult): Blob {
  const exportRows = buildExportRows(result);
  const headers = ["Key", "Change Type", "Column", "Old Value", "New Value"];
  const lines: string[] = [headers.map(escapeCsvField).join(",")];

  for (const row of exportRows) {
    lines.push(
      [row.key, row.changeType, row.column, row.oldValue, row.newValue]
        .map(escapeCsvField)
        .join(",")
    );
  }

  return new Blob([lines.join("\r\n") + "\r\n"], { type: "text/csv" });
}

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
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
