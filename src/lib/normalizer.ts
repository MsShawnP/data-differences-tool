import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

import type { ColumnMetadata, DiffConfig } from "@/types";

dayjs.extend(customParseFormat);

const DATE_FORMATS = [
  "YYYY-MM-DD",
  "MM/DD/YYYY",
  "DD/MM/YYYY",
  "M/D/YYYY",
  "MMM D, YYYY",
  "MMMM D, YYYY",
];

const CURRENCY_SYMBOLS = /[$€£]/g; // $, euro, pound

// Excel epoch: Jan 0, 1900 = serial 1. JS epoch offset: 25569 days.
const EXCEL_SERIAL_MIN = 1;
const EXCEL_SERIAL_MAX = 2958465;

function isExcelDateSerial(value: unknown): boolean {
  if (typeof value !== "number") return false;
  return value >= EXCEL_SERIAL_MIN && value <= EXCEL_SERIAL_MAX;
}

function excelSerialToISO(serial: number): string {
  // Excel serial 1 = 1900-01-01. Offset 25570 aligns with JS epoch.
  // (Excel has a known Lotus 1-2-3 bug treating 1900 as a leap year,
  // but for dates after 1900-03-01 this offset is correct.)
  const ms = (serial - 25570) * 86400000;
  const date = new Date(ms);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeNumeric(value: unknown): string {
  if (value == null || value === "") return "";

  const str = String(value).trim().replace(CURRENCY_SYMBOLS, "").replace(/,/g, "");
  const num = Number(str);
  if (Number.isNaN(num)) return String(value).trim();
  return String(num);
}

function normalizeDate(value: unknown): string {
  if (value == null || value === "") return "";

  // Handle Excel date serial numbers
  if (typeof value === "number" && isExcelDateSerial(value)) {
    return excelSerialToISO(value);
  }

  const str = String(value).trim();
  if (str === "") return "";

  // Try each format with strict parsing
  for (const fmt of DATE_FORMATS) {
    const parsed = dayjs(str, fmt, true);
    if (parsed.isValid()) {
      return parsed.format("YYYY-MM-DD");
    }
  }

  // Fallback: try native Date parsing for ISO-like strings
  const fallback = dayjs(str);
  if (fallback.isValid()) {
    return fallback.format("YYYY-MM-DD");
  }

  // If nothing works, return trimmed string
  return str;
}

function normalizeText(value: unknown): string {
  if (value == null || value === "") return "";
  return String(value).trim().replace(/\s+/g, " ");
}

/**
 * Normalizes a single cell value for comparison based on detected column type.
 * Returns a canonical string representation.
 */
export function normalizeValue(
  value: unknown,
  columnMeta: ColumnMetadata,
  config: DiffConfig
): string {
  if (value == null || value === "") return "";

  let normalized: string;

  switch (columnMeta.detectedType) {
    case "number": {
      normalized = normalizeNumeric(value);
      break;
    }
    case "date": {
      normalized = normalizeDate(value);
      break;
    }
    case "text":
    case "unknown":
    default: {
      // If format is '@' (text-formatted), preserve original string but trim
      if (columnMeta.formatString === "@") {
        normalized = String(value).trim();
      } else {
        normalized = normalizeText(value);
      }
      break;
    }
  }

  if (!config.caseSensitive) {
    normalized = normalized.toLowerCase();
  }

  return normalized;
}

/**
 * Compares two cell values with type-aware normalization and tolerance.
 * Returns true if values are considered equal after normalization.
 */
export function valuesAreEqual(
  a: unknown,
  b: unknown,
  columnMeta: ColumnMetadata,
  config: DiffConfig
): boolean {
  // Both null/undefined/empty are equal
  const aEmpty = a == null || a === "";
  const bEmpty = b == null || b === "";
  if (aEmpty && bEmpty) return true;
  if (aEmpty !== bEmpty) return false;

  // For numeric columns, compare with tolerance
  if (columnMeta.detectedType === "number") {
    const aStr = String(a).trim().replace(CURRENCY_SYMBOLS, "").replace(/,/g, "");
    const bStr = String(b).trim().replace(CURRENCY_SYMBOLS, "").replace(/,/g, "");
    const aNum = Number(aStr);
    const bNum = Number(bStr);

    if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
      return Math.abs(aNum - bNum) <= config.numericTolerance;
    }
  }

  // For all types, fall back to normalized string comparison
  const normalizedA = normalizeValue(a, columnMeta, config);
  const normalizedB = normalizeValue(b, columnMeta, config);
  return normalizedA === normalizedB;
}
