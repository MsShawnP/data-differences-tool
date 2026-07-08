import type { ColumnChange } from "@/types";

interface ColumnChangesProps {
  changes: ColumnChange[];
}

export function ColumnChanges({ changes }: ColumnChangesProps) {
  if (changes.length === 0) return null;

  return (
    <div className="rounded-sm border border-border bg-white p-6">
      <h3 className="mb-3 font-serif text-lg font-bold text-text-primary">
        Column Changes
      </h3>
      <ul className="space-y-2">
        {changes.map((change, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <ChangeTag type={change.type} />
            <span className="text-text-primary">
              {change.type === "renamed" && change.details ? (
                <>
                  <span className="font-medium">{change.details.oldName}</span>
                  {" → "}
                  <span className="font-medium">{change.details.newName}</span>
                  <span className="ml-2 text-text-secondary">
                    ({Math.round((change.details.confidence ?? 0) * 100)}% match)
                  </span>
                </>
              ) : change.type === "reordered" ? (
                <span className="font-medium">Columns reordered</span>
              ) : (
                <span className="font-medium">{change.columnName}</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChangeTag({ type }: { type: ColumnChange["type"] }) {
  const styles = {
    added: "bg-green/10 text-green",
    removed: "bg-red-surface text-red",
    renamed: "bg-amber/10 text-amber",
    reordered: "bg-steel-blue/10 text-steel-blue",
  };

  return (
    <span className={`rounded-sm px-2 py-0.5 text-xs font-medium ${styles[type]}`}>
      {type}
    </span>
  );
}
