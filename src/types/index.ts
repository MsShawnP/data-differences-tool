export type ColumnType = "number" | "date" | "text" | "unknown";

export interface ColumnMetadata {
  name: string;
  detectedType: ColumnType;
  formatString?: string;
  index: number;
}

export interface ParsedFile {
  fileName: string;
  rows: Record<string, unknown>[];
  columns: ColumnMetadata[];
  rowCount: number;
}

export interface DiffConfig {
  keyColumns: string[];
  caseSensitive: boolean;
  numericTolerance: number;
}

export type ColumnChangeType = "added" | "removed" | "renamed" | "reordered";

export interface ColumnChange {
  type: ColumnChangeType;
  columnName: string;
  details?: {
    oldName?: string;
    newName?: string;
    oldIndex?: number;
    newIndex?: number;
    confidence?: number;
  };
}

export interface CellDiff {
  column: string;
  oldValue: unknown;
  newValue: unknown;
  wasNormalized: boolean;
}

export interface RowChange {
  type: "added" | "removed" | "modified";
  keyValues: Record<string, unknown>;
  rowIndex: number;
  changes?: CellDiff[];
}

export interface DiffResult {
  summary: {
    totalRowsA: number;
    totalRowsB: number;
    addedCount: number;
    removedCount: number;
    modifiedCount: number;
    unchangedCount: number;
  };
  columnChanges: ColumnChange[];
  rowChanges: RowChange[];
  keyColumnsUsed: string[];
  config: DiffConfig;
}

export type WorkflowStep =
  | "idle"
  | "files-uploaded"
  | "configured"
  | "computing"
  | "results"
  | "error";

export interface WorkflowState {
  step: WorkflowStep;
  fileA: ParsedFile | null;
  fileB: ParsedFile | null;
  config: DiffConfig | null;
  result: DiffResult | null;
  error: string | null;
}
