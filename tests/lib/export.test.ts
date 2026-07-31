import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import { exportToCsv, exportToExcel, escapeCsvField } from "@/lib/export";
import type { DiffResult } from "@/types";

async function loadWorkbook(blob: Blob): Promise<ExcelJS.Workbook> {
  const buffer = await blob.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return workbook;
}

function makeDiffResult(overrides: Partial<DiffResult> = {}): DiffResult {
  return {
    summary: {
      totalRowsA: 10,
      totalRowsB: 10,
      addedCount: 0,
      removedCount: 0,
      modifiedCount: 0,
      unchangedCount: 10,
    },
    columnChanges: [],
    rowChanges: [],
    keyColumnsUsed: ["id"],
    config: { keyColumns: ["id"], caseSensitive: true, numericTolerance: 1e-9 },
    ...overrides,
  };
}

describe("exportToCsv", () => {
  it("generates valid CSV with headers and change data", async () => {
    const result = makeDiffResult({
      summary: {
        totalRowsA: 10,
        totalRowsB: 12,
        addedCount: 2,
        removedCount: 0,
        modifiedCount: 3,
        unchangedCount: 7,
      },
      rowChanges: [
        { type: "added", keyValues: { id: "11" }, rowIndex: 10 },
        { type: "added", keyValues: { id: "12" }, rowIndex: 11 },
        {
          type: "modified",
          keyValues: { id: "1" },
          rowIndex: 0,
          changes: [
            { column: "name", oldValue: "Alice", newValue: "Alicia", wasNormalized: false },
          ],
        },
        {
          type: "modified",
          keyValues: { id: "2" },
          rowIndex: 1,
          changes: [
            { column: "status", oldValue: "active", newValue: "inactive", wasNormalized: false },
          ],
        },
        {
          type: "modified",
          keyValues: { id: "3" },
          rowIndex: 2,
          changes: [
            { column: "amount", oldValue: "100", newValue: "200", wasNormalized: false },
          ],
        },
      ],
    });

    const blob = exportToCsv(result);
    expect(blob.type).toBe("text/csv");

    const text = await blob.text();
    const lines = text.trim().split("\r\n");

    expect(lines[0]).toBe("Key,Change Type,Column,Old Value,New Value,Normalized");
    // Added rows carry only key + type; the value columns are blank.
    expect(lines).toContain("11,Added,,,,");
    expect(lines).toContain("12,Added,,,,");
    // Modified rows carry the column and before/after values.
    expect(lines).toContain("1,Modified,name,Alice,Alicia,");
    expect(lines).toContain("2,Modified,status,active,inactive,");
    expect(lines).toContain("3,Modified,amount,100,200,");
    // Header + 5 change rows.
    expect(lines).toHaveLength(6);
  });

  it("generates CSV with zero changes showing just headers", () => {
    const result = makeDiffResult();
    const blob = exportToCsv(result);
    expect(blob.size).toBeGreaterThan(0);
  });

  it("discloses which cells were compared after normalizing formatting", async () => {
    const result = makeDiffResult({
      summary: {
        totalRowsA: 2,
        totalRowsB: 2,
        addedCount: 0,
        removedCount: 0,
        modifiedCount: 2,
        unchangedCount: 0,
      },
      rowChanges: [
        {
          type: "modified",
          keyValues: { id: "1" },
          rowIndex: 0,
          changes: [
            { column: "shipped", oldValue: "2026-01-05", newValue: "1/6/2026", wasNormalized: true },
          ],
        },
        {
          type: "modified",
          keyValues: { id: "2" },
          rowIndex: 1,
          changes: [
            { column: "status", oldValue: "open", newValue: "closed", wasNormalized: false },
          ],
        },
      ],
    });

    const text = await exportToCsv(result).text();
    const lines = text.trim().split("\r\n");

    expect(lines[0]).toBe("Key,Change Type,Column,Old Value,New Value,Normalized");
    expect(lines[1]).toBe("1,Modified,shipped,2026-01-05,1/6/2026,Yes");
    expect(lines[2]).toBe("2,Modified,status,open,closed,");
  });

  it("renders a Date-typed key column as YYYY-MM-DD, not a raw JS Date string", async () => {
    const result = makeDiffResult({
      summary: {
        totalRowsA: 1,
        totalRowsB: 1,
        addedCount: 0,
        removedCount: 0,
        modifiedCount: 1,
        unchangedCount: 0,
      },
      keyColumnsUsed: ["ship_date"],
      config: { keyColumns: ["ship_date"], caseSensitive: true, numericTolerance: 1e-9 },
      rowChanges: [
        {
          type: "modified",
          keyValues: { ship_date: new Date(Date.UTC(2024, 1, 10)) },
          rowIndex: 0,
          changes: [
            { column: "amount", oldValue: "100", newValue: "200", wasNormalized: false },
          ],
        },
      ],
    });

    const text = await exportToCsv(result).text();
    const lines = text.trim().split("\r\n");

    // The key cell must be the calendar date, never "Fri Feb 09 2024 19:00:00 GMT-0500".
    expect(lines[1]).toBe("2024-02-10,Modified,amount,100,200,");
  });

  it("properly escapes fields with commas and quotes", async () => {
    const result = makeDiffResult({
      summary: {
        totalRowsA: 1,
        totalRowsB: 1,
        addedCount: 0,
        removedCount: 0,
        modifiedCount: 1,
        unchangedCount: 0,
      },
      rowChanges: [
        {
          type: "modified",
          keyValues: { id: "1" },
          rowIndex: 0,
          changes: [
            {
              column: "description",
              oldValue: 'value with "quotes"',
              newValue: "value, with comma",
              wasNormalized: false,
            },
          ],
        },
      ],
    });

    const text = await exportToCsv(result).text();
    const lines = text.trim().split("\r\n");

    // Quotes are doubled and the field wrapped; the comma field is wrapped.
    expect(lines[1]).toBe('1,Modified,description,"value with ""quotes""","value, with comma",');
  });
});

describe("exportToExcel", () => {
  it("writes a Summary sheet whose metric rows reflect the result counts", async () => {
    const result = makeDiffResult({
      summary: {
        totalRowsA: 10,
        totalRowsB: 12,
        addedCount: 2,
        removedCount: 1,
        modifiedCount: 3,
        unchangedCount: 6,
        excludedRowCount: 4,
      },
      rowChanges: [
        { type: "added", keyValues: { id: "11" }, rowIndex: 10 },
        { type: "removed", keyValues: { id: "9" }, rowIndex: 8 },
        {
          type: "modified",
          keyValues: { id: "1" },
          rowIndex: 0,
          changes: [{ column: "amount", oldValue: "100", newValue: "200", wasNormalized: false }],
        },
      ],
    });

    const workbook = await loadWorkbook(await exportToExcel(result));
    const summary = workbook.getWorksheet("Summary");
    expect(summary).toBeDefined();

    // Map "Metric" -> Count from the metric table.
    const metrics = new Map<string, unknown>();
    summary!.eachRow((row) => {
      const label = row.getCell(1).value;
      if (typeof label === "string") metrics.set(label, row.getCell(2).value);
    });

    expect(metrics.get("Total rows (File A)")).toBe(10);
    expect(metrics.get("Total rows (File B)")).toBe(12);
    expect(metrics.get("Added rows")).toBe(2);
    expect(metrics.get("Removed rows")).toBe(1);
    expect(metrics.get("Modified rows")).toBe(3);
    expect(metrics.get("Unchanged rows")).toBe(6);
    expect(metrics.get("Duplicate/blank keys excluded")).toBe(4);
  });

  it("writes a Changes sheet with a header and one color-coded row per change", async () => {
    const result = makeDiffResult({
      summary: {
        totalRowsA: 3,
        totalRowsB: 3,
        addedCount: 1,
        removedCount: 1,
        modifiedCount: 1,
        unchangedCount: 0,
      },
      rowChanges: [
        { type: "added", keyValues: { id: "3" }, rowIndex: 2 },
        { type: "removed", keyValues: { id: "2" }, rowIndex: 1 },
        {
          type: "modified",
          keyValues: { id: "1" },
          rowIndex: 0,
          changes: [{ column: "amount", oldValue: "100", newValue: "200", wasNormalized: false }],
        },
      ],
    });

    const workbook = await loadWorkbook(await exportToExcel(result));
    const changes = workbook.getWorksheet("Changes");
    expect(changes).toBeDefined();

    // Row 1 header, rows 2-4 the three changes.
    expect(changes!.getRow(1).getCell(1).value).toBe("Key");
    expect(changes!.getRow(1).getCell(2).value).toBe("Change Type");

    const byType = new Map<string, ExcelJS.Row>();
    changes!.eachRow((row, n) => {
      if (n === 1) return;
      byType.set(String(row.getCell(2).value), row);
    });

    // Fill color distinguishes Added (green), Removed (red), Modified (yellow).
    const fillOf = (row: ExcelJS.Row) =>
      (row.getCell(1).fill as ExcelJS.FillPattern)?.fgColor?.argb;
    expect(fillOf(byType.get("Added")!)).toBe("FFE4F5F0");
    expect(fillOf(byType.get("Removed")!)).toBe("FFFCE8E7");
    expect(fillOf(byType.get("Modified")!)).toBe("FFFDEEE0");

    // The modified row carries the column and before/after values.
    const modified = byType.get("Modified")!;
    expect(modified.getCell(3).value).toBe("amount");
    expect(modified.getCell(4).value).toBe("100");
    expect(modified.getCell(5).value).toBe("200");
  });

  it("writes a 'No row differences found' row when there are no row changes", async () => {
    const workbook = await loadWorkbook(await exportToExcel(makeDiffResult()));
    const changes = workbook.getWorksheet("Changes");
    expect(changes!.getRow(2).getCell(1).value).toBe("No row differences found");
  });
});

describe("escapeCsvField — formula injection", () => {
  it("prefixes a leading = with an apostrophe", () => {
    expect(escapeCsvField("=SUM(A1:A9)")).toBe("'=SUM(A1:A9)");
  });

  it("neutralizes a command payload starting with -", () => {
    expect(escapeCsvField("-2+3+cmd|' /c calc'!A1")).toBe(
      "'-2+3+cmd|' /c calc'!A1"
    );
  });

  it("neutralizes leading + and @ triggers", () => {
    expect(escapeCsvField("+1+1")).toBe("'+1+1");
    expect(escapeCsvField("@foo")).toBe("'@foo");
  });

  it("leaves a plain negative number untouched", () => {
    expect(escapeCsvField("-100")).toBe("-100");
    expect(escapeCsvField("-3.25")).toBe("-3.25");
  });

  it("leaves ordinary text untouched", () => {
    expect(escapeCsvField("Alice")).toBe("Alice");
  });

  it("still quotes a neutralized field that also contains a comma", () => {
    expect(escapeCsvField("=A1,B1")).toBe('"\'=A1,B1"');
  });

  it("quotes a field containing a lone carriage return", () => {
    // A bare \r would otherwise break the row boundary when the CSV is reopened.
    expect(escapeCsvField("line1\rline2")).toBe('"line1\rline2"');
  });

  it("quotes a field containing a newline", () => {
    expect(escapeCsvField("line1\nline2")).toBe('"line1\nline2"');
  });
});
