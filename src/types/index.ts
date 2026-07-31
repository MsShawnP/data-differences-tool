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

// Discriminated on `type` so each variant carries exactly the payload it needs
// and invalid states (a renamed change with no names, an added change with no
// column) are unrepresentable rather than defended against at every read site.
export interface AddedColumn {
  type: "added";
  columnName: string;
}

export interface RemovedColumn {
  type: "removed";
  columnName: string;
}

export interface RenamedColumn {
  type: "renamed";
  oldName: string;
  newName: string;
  confidence: number;
}

export interface ReorderedColumns {
  type: "reordered";
}

export type ColumnChange =
  | AddedColumn
  | RemovedColumn
  | RenamedColumn
  | ReorderedColumns;

export interface CellDiff {
  column: string;
  oldValue: unknown;
  newValue: unknown;
  wasNormalized: boolean;
}

export type RowChange = AddedRow | RemovedRow | ModifiedRow;

interface BaseRow {
  keyValues: Record<string, unknown>;
  rowIndex: number;
}

export interface AddedRow extends BaseRow {
  type: "added";
}

export interface RemovedRow extends BaseRow {
  type: "removed";
}

export interface ModifiedRow extends BaseRow {
  type: "modified";
  changes: CellDiff[];
}

export interface DiffResult {
  summary: {
    totalRowsA: number;
    totalRowsB: number;
    addedCount: number;
    removedCount: number;
    modifiedCount: number;
    unchangedCount: number;
    // Distinct composite keys actually compared per file. When a file has
    // duplicate or blank keys, distinctKeys is smaller than the raw row count.
    distinctKeysA?: number;
    distinctKeysB?: number;
    // Rows dropped from comparison because their key duplicated another row's
    // key or was blank (raw rows minus distinct keys, across both files).
    excludedRowCount?: number;
  };
  columnChanges: ColumnChange[];
  rowChanges: RowChange[];
  keyColumnsUsed: string[];
  config: DiffConfig;
  warnings: string[];
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
