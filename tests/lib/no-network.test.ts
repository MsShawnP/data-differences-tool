// Browser-local guarantee: comparing two client files must make NO network call.
//
// Client mode for this tool is "two client files compared locally, nothing
// uploaded anywhere." This test makes that permanent: it spies on every network
// primitive, runs the full diff, and asserts none of them were touched.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { computeDiff } from "@/lib/differ";
import { generateSummary } from "@/lib/summary-generator";
import type { DiffConfig, ParsedFile } from "@/types";

function makeParsedFile(
  fileName: string,
  columns: string[],
  rows: Record<string, unknown>[]
): ParsedFile {
  return {
    fileName,
    columns: columns.map((name, index) => ({ name, detectedType: "text" as const, index })),
    rows,
    rowCount: rows.length,
  };
}

const config: DiffConfig = { keyColumns: ["id"], caseSensitive: true, numericTolerance: 1e-9 };

describe("no network with files loaded", () => {
  const spies: Array<() => void> = [];
  const fetchSpy = vi.fn();
  const beaconSpy = vi.fn();
  const wsSpy = vi.fn();
  const xhrOpenSpy = vi.fn();
  const xhrSendSpy = vi.fn();

  beforeEach(() => {
    const g = globalThis as any;
    for (const [obj, key, spy] of [
      [g, "fetch", fetchSpy],
      [g.navigator ?? (g.navigator = {}), "sendBeacon", beaconSpy],
      [g, "WebSocket", wsSpy],
    ] as const) {
      const original = obj[key];
      obj[key] = spy;
      spies.push(() => (obj[key] = original));
    }
    if (g.XMLHttpRequest) {
      const openOrig = g.XMLHttpRequest.prototype.open;
      const sendOrig = g.XMLHttpRequest.prototype.send;
      g.XMLHttpRequest.prototype.open = xhrOpenSpy;
      g.XMLHttpRequest.prototype.send = xhrSendSpy;
      spies.push(() => {
        g.XMLHttpRequest.prototype.open = openOrig;
        g.XMLHttpRequest.prototype.send = sendOrig;
      });
    }
  });

  afterEach(() => {
    while (spies.length) spies.pop()!();
    vi.clearAllMocks();
  });

  it("computes a diff and a summary without any network call", () => {
    const fileA = makeParsedFile("a.csv", ["id", "v"], [
      { id: "1", v: "x" }, { id: "2", v: "y" },
    ]);
    const fileB = makeParsedFile("b.csv", ["id", "v"], [
      { id: "1", v: "x" }, { id: "2", v: "z" },
    ]);

    const result = computeDiff(fileA, fileB, config);
    generateSummary(result);

    expect(result.summary.modifiedCount).toBe(1);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(beaconSpy).not.toHaveBeenCalled();
    expect(wsSpy).not.toHaveBeenCalled();
    expect(xhrOpenSpy).not.toHaveBeenCalled();
    expect(xhrSendSpy).not.toHaveBeenCalled();
  });
});
