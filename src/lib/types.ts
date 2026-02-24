export interface DatabaseInfo {
  id: string;
  name: string;
  data: Uint8Array;
  createdAt: number;
  updatedAt: number;
}

export interface QueryTab {
  id: string;
  dbId: string;
  title: string;
  sql: string;
}

export interface QueryResult {
  columns: string[];
  values: any[][];
  error?: string;
  executedAt: number;
}

export interface QueryHistoryEntry {
  id: string;
  dbId: string;
  sql: string;
  executedAt: number;
  rowCount: number;
  error?: string;
}

export interface SavedQuery {
  id: string;
  name: string;
  sql: string;
  dbId?: string;
  createdAt: number;
}

export interface TableSchema {
  name: string;
  columns: ColumnInfo[];
}

export interface ColumnInfo {
  name: string;
  type: string;
  notnull: boolean;
  pk: boolean;
}
