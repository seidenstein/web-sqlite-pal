import { useCallback, useRef, useState } from 'react';
import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js';
import type { QueryResult, TableSchema, ColumnInfo } from '@/lib/types';

let sqlPromise: ReturnType<typeof initSqlJs> | null = null;

function getSql() {
  if (!sqlPromise) {
    sqlPromise = initSqlJs({
      locateFile: (file) => import.meta.env.BASE_URL + file,
    }).catch(err => {
      sqlPromise = null;
      throw err;
    });
  }
  return sqlPromise;
}

export function useSqlite() {
  const dbRef = useRef<SqlJsDatabase | null>(null);
  const [schema, setSchema] = useState<TableSchema[]>([]);

  const refreshSchema = useCallback(() => {
    if (!dbRef.current) {
      setSchema([]);
      return;
    }
    try {
      const tables = dbRef.current.exec(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
      );
      if (tables.length === 0) {
        setSchema([]);
        return;
      }
      const result: TableSchema[] = [];
      for (const row of tables[0].values) {
        const tableName = row[0] as string;
        const info = dbRef.current.exec(`PRAGMA table_info("${tableName}")`);
        const columns: ColumnInfo[] = info.length > 0
          ? info[0].values.map(r => ({
              name: r[1] as string,
              type: r[2] as string,
              notnull: r[3] === 1,
              pk: r[5] === 1,
            }))
          : [];
        result.push({ name: tableName, columns });
      }
      setSchema(result);
    } catch {
      setSchema([]);
    }
  }, []);

  const openEmpty = useCallback(async () => {
    const SQL = await getSql();
    dbRef.current?.close();
    dbRef.current = new SQL.Database();
    refreshSchema();
  }, [refreshSchema]);

  const openFile = useCallback(async (data: Uint8Array) => {
    const SQL = await getSql();
    dbRef.current?.close();
    dbRef.current = new SQL.Database(data);
    refreshSchema();
  }, [refreshSchema]);

  const exportData = useCallback((): Uint8Array | null => {
    return dbRef.current?.export() ?? null;
  }, []);

  const execute = useCallback((sql: string): QueryResult => {
    if (!dbRef.current) {
      return { columns: [], values: [], error: 'No database open', executedAt: Date.now() };
    }
    try {
      const results = dbRef.current.exec(sql);
      if (results.length === 0) {
        refreshSchema();
        return { columns: [], values: [], executedAt: Date.now() };
      }
      const last = results[results.length - 1];
      refreshSchema();
      return { columns: last.columns, values: last.values, executedAt: Date.now() };
    } catch (e: any) {
      return { columns: [], values: [], error: e.message ?? String(e), executedAt: Date.now() };
    }
  }, [refreshSchema]);

  const close = useCallback(() => {
    dbRef.current?.close();
    dbRef.current = null;
    setSchema([]);
  }, []);

  return { openEmpty, openFile, exportData, execute, schema, close };
}
