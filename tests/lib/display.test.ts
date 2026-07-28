import { describe, it, expect } from "vitest";

import { formatCellValue } from "@/lib/display";

describe("formatCellValue", () => {
  it("renders a date-only Date as YYYY-MM-DD", () => {
    expect(formatCellValue(new Date(Date.UTC(2024, 1, 10)))).toBe("2024-02-10");
  });

  it("does not shift the calendar day under a negative UTC offset", () => {
    // The bug: String(date) on this value yields
    // "Fri Feb 09 2024 19:00:00 GMT-0500" in America/New_York — a day early.
    const value = new Date(Date.UTC(2024, 1, 10));
    expect(formatCellValue(value)).toBe("2024-02-10");
    expect(formatCellValue(value)).not.toContain("GMT");
  });

  it("keeps a time component rather than truncating it", () => {
    expect(formatCellValue(new Date(Date.UTC(2024, 1, 10, 14, 30, 5)))).toBe(
      "2024-02-10 14:30:05"
    );
  });

  it("keeps milliseconds when they carry information", () => {
    expect(formatCellValue(new Date(Date.UTC(2024, 1, 10, 0, 0, 0, 250)))).toBe(
      "2024-02-10 00:00:00.250"
    );
  });

  it("never renders two distinct instants as the same string", () => {
    const a = new Date(Date.UTC(2024, 1, 10, 9, 0, 0));
    const b = new Date(Date.UTC(2024, 1, 10, 17, 0, 0));
    expect(formatCellValue(a)).not.toBe(formatCellValue(b));
  });

  it("renders an invalid Date as empty rather than 'Invalid Date'", () => {
    expect(formatCellValue(new Date("not a date"))).toBe("");
  });

  it("passes every non-Date value through untouched", () => {
    expect(formatCellValue("1,000")).toBe("1,000");
    expect(formatCellValue(1000)).toBe("1000");
    expect(formatCellValue(0)).toBe("0");
    expect(formatCellValue(false)).toBe("false");
    expect(formatCellValue("2024-02-10")).toBe("2024-02-10");
  });

  it("renders null and undefined as empty", () => {
    expect(formatCellValue(null)).toBe("");
    expect(formatCellValue(undefined)).toBe("");
  });

  it("leaves an Excel serial number alone", () => {
    // 45332 is a plausible date serial and a plausible quantity. Guessing
    // would corrupt the second case, so display does not guess.
    expect(formatCellValue(45332)).toBe("45332");
  });
});
