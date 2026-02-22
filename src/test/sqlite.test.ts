import { describe, it, expect } from 'vitest';
import initSqlJs from 'sql.js';

describe('sql.js basic', () => {
  it('executes SELECT 42', async () => {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    const results = db.exec('SELECT 42 as answer');
    console.log('results:', JSON.stringify(results));
    expect(results.length).toBe(1);
    expect(results[0].columns).toEqual(['answer']);
    expect(results[0].values).toEqual([[42]]);
    db.close();
  });

  it('creates table, inserts, selects', async () => {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    db.exec('CREATE TABLE t(id INT, name TEXT)');
    db.exec("INSERT INTO t VALUES(1, 'hello')");
    const results = db.exec('SELECT * FROM t');
    console.log('results:', JSON.stringify(results));
    expect(results.length).toBe(1);
    expect(results[0].columns).toEqual(['id', 'name']);
    expect(results[0].values).toEqual([[1, 'hello']]);
    db.close();
  });
});

describe('sql.js export/import round-trip', () => {
  it('preserves data after export and re-import', async () => {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    db.exec('CREATE TABLE users(id INT, name TEXT)');
    db.exec("INSERT INTO users VALUES(1, 'Alice')");
    db.exec("INSERT INTO users VALUES(2, 'Bob')");

    // Export and re-import (simulates page reload)
    const exported = db.export();
    db.close();
    const db2 = new SQL.Database(exported);
    const results = db2.exec('SELECT * FROM users');
    console.log('round-trip results:', JSON.stringify(results));
    expect(results.length).toBe(1);
    expect(results[0].columns).toEqual(['id', 'name']);
    expect(results[0].values).toEqual([[1, 'Alice'], [2, 'Bob']]);
    db2.close();
  });
});

describe('execute function logic (mirrors use-sqlite hook)', () => {
  // This mirrors the exact logic from use-sqlite.ts execute()
  function execute(db: any, sql: string) {
    try {
      const results = db.exec(sql);
      if (results.length === 0) {
        return { columns: [], values: [] };
      }
      const last = results[results.length - 1];
      return { columns: last.columns, values: last.values };
    } catch (e: any) {
      return { columns: [], values: [], error: e.message };
    }
  }

  it('returns rows for SELECT after INSERT', async () => {
    const SQL = await initSqlJs();
    const db = new SQL.Database();

    const r1 = execute(db, 'CREATE TABLE t(id INT, name TEXT)');
    console.log('CREATE result:', JSON.stringify(r1));
    expect(r1.columns).toEqual([]);

    const r2 = execute(db, "INSERT INTO t VALUES(1, 'Alice')");
    console.log('INSERT result:', JSON.stringify(r2));
    expect(r2.columns).toEqual([]);

    const r3 = execute(db, 'SELECT * FROM t');
    console.log('SELECT result:', JSON.stringify(r3));
    expect(r3.columns).toEqual(['id', 'name']);
    expect(r3.values.length).toBe(1);
    expect(r3.values).toEqual([[1, 'Alice']]);
    db.close();
  });

  it('returns empty for SELECT on empty table', async () => {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    execute(db, 'CREATE TABLE t(id INT)');
    const result = execute(db, 'SELECT * FROM t');
    console.log('empty table SELECT:', JSON.stringify(result));
    // sql.js returns [] for SELECT with 0 rows — columns are lost
    expect(result.columns).toEqual([]);
    expect(result.values).toEqual([]);
    db.close();
  });

  it('handles multi-statement with final SELECT', async () => {
    const SQL = await initSqlJs();
    const db = new SQL.Database();
    const result = execute(db, "CREATE TABLE t(id INT); INSERT INTO t VALUES(1); SELECT * FROM t;");
    console.log('multi-statement result:', JSON.stringify(result));
    expect(result.columns).toEqual(['id']);
    expect(result.values).toEqual([[1]]);
    db.close();
  });

  it('preserves data across separate execute calls', async () => {
    const SQL = await initSqlJs();
    const db = new SQL.Database();

    execute(db, 'CREATE TABLE t(id INT, val TEXT)');
    execute(db, "INSERT INTO t VALUES(1, 'a')");
    execute(db, "INSERT INTO t VALUES(2, 'b')");
    execute(db, "INSERT INTO t VALUES(3, 'c')");

    const result = execute(db, 'SELECT * FROM t ORDER BY id');
    console.log('multi-insert result:', JSON.stringify(result));
    expect(result.values.length).toBe(3);
    db.close();
  });

  it('preserves data after export/import cycle between executes', async () => {
    const SQL = await initSqlJs();
    let db = new SQL.Database();

    execute(db, 'CREATE TABLE t(id INT)');
    execute(db, 'INSERT INTO t VALUES(1)');

    // Simulate what executeQuery does: export after each query
    const data1 = db.export();

    // Simulate switchDatabase: reopen from exported data
    db.close();
    db = new SQL.Database(data1);

    execute(db, 'INSERT INTO t VALUES(2)');
    const data2 = db.export();

    db.close();
    db = new SQL.Database(data2);

    const result = execute(db, 'SELECT * FROM t ORDER BY id');
    console.log('export/import cycle result:', JSON.stringify(result));
    expect(result.values.length).toBe(2);
    expect(result.values).toEqual([[1], [2]]);
    db.close();
  });
});
