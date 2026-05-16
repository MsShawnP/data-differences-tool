import type { DiffResult } from "@/types";
import { generateSummary } from "@/lib/summary-generator";

interface DiffSummaryProps {
  result: DiffResult;
}

export function DiffSummary({ result }: DiffSummaryProps) {
  const summary = generateSummary(result);

  return (
    <div className="rounded-sm border border-border bg-white p-6">
      <p className="text-base leading-relaxed text-text-primary">{summary}</p>
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <Stat label="Added" value={result.summary.addedCount} color="text-green" />
        <Stat label="Removed" value={result.summary.removedCount} color="text-red" />
        <Stat label="Modified" value={result.summary.modifiedCount} color="text-amber" />
        <Stat label="Unchanged" value={result.summary.unchangedCount} color="text-text-secondary" />
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className={`font-semibold ${color}`}>{value}</span>
      <span className="text-text-secondary">{label}</span>
    </div>
  );
}
