/**
 * Rendering a raw cell value as text for a human to read.
 *
 * This is a display concern, deliberately kept out of normalizer.ts. The
 * normalizer decides whether two values are *equal*; this decides how one
 * value *looks*. Conflating them is how a diff tool starts lying: normalize
 * for display and the "formatting normalized" tag points at a difference the
 * reader can no longer see.
 */

/**
 * Convert a raw cell value to display text.
 *
 * Narrow on purpose: it converts `Date` objects and nothing else. Everywhere
 * else this is exactly `String(value ?? "")`, because the app shows raw values
 * and tags the cells whose difference was only cosmetic. A `Date` is the one
 * case where the raw form is both unreadable and wrong — `String(date)` on a
 * 2024-02-10 date yields "Fri Feb 09 2024 19:00:00 GMT-0500" under a negative
 * UTC offset, which is a different calendar day than the file says.
 *
 * UTC-anchored, matching every branch of `normalizeDate`. A date-only value
 * renders as `YYYY-MM-DD`; a value carrying a time renders with that time
 * rather than being truncated, so two distinct instants never display as the
 * same string.
 */
export function formatCellValue(value: unknown): string {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";

    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, "0");
    const day = String(value.getUTCDate()).padStart(2, "0");
    const date = `${year}-${month}-${day}`;

    const hours = value.getUTCHours();
    const minutes = value.getUTCMinutes();
    const seconds = value.getUTCSeconds();
    const ms = value.getUTCMilliseconds();

    // Midnight UTC means a date-only cell: show the date alone. Anything else
    // carries real information — truncating it would render two different
    // timestamps identically, the same class of bug as the identical-verdict
    // sentence.
    if (hours === 0 && minutes === 0 && seconds === 0 && ms === 0) return date;

    const time =
      `${String(hours).padStart(2, "0")}:` +
      `${String(minutes).padStart(2, "0")}:` +
      `${String(seconds).padStart(2, "0")}` +
      (ms === 0 ? "" : `.${String(ms).padStart(3, "0")}`);

    return `${date} ${time}`;
  }

  return String(value ?? "");
}
