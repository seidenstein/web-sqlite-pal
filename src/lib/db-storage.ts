import { openDB, type IDBPDatabase } from 'idb';
import type { DatabaseInfo, QueryHistoryEntry, SavedQuery } from './types';

const DB_NAME = 'seiden-sqlite';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('databases')) {
          db.createObjectStore('databases', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('history')) {
          const store = db.createObjectStore('history', { keyPath: 'id' });
          store.createIndex('byDb', 'dbId');
        }
        if (!db.objectStoreNames.contains('saved')) {
          db.createObjectStore('saved', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveDatabase(info: DatabaseInfo): Promise<void> {
  const db = await getDB();
  await db.put('databases', info);
}

export async function loadDatabase(id: string): Promise<DatabaseInfo | undefined> {
  const db = await getDB();
  return db.get('databases', id);
}

export async function listDatabases(): Promise<DatabaseInfo[]> {
  const db = await getDB();
  return db.getAll('databases');
}

export async function deleteDatabase(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('databases', id);
}

export async function addHistoryEntry(entry: QueryHistoryEntry): Promise<void> {
  const db = await getDB();
  await db.put('history', entry);
  // Keep only the last 200 entries
  const all = await db.getAll('history');
  if (all.length > 200) {
    const toDelete = all
      .sort((a, b) => a.executedAt - b.executedAt)
      .slice(0, all.length - 200);
    const tx = db.transaction('history', 'readwrite');
    for (const e of toDelete) {
      await tx.store.delete(e.id);
    }
    await tx.done;
  }
}

export async function getHistory(dbId?: string): Promise<QueryHistoryEntry[]> {
  const db = await getDB();
  const all = await db.getAll('history');
  const filtered = dbId ? all.filter(e => e.dbId === dbId) : all;
  return filtered.sort((a, b) => b.executedAt - a.executedAt);
}

export async function clearHistory(): Promise<void> {
  const db = await getDB();
  await db.clear('history');
}

export async function saveQuery(query: SavedQuery): Promise<void> {
  const db = await getDB();
  await db.put('saved', query);
}

export async function getSavedQueries(): Promise<SavedQuery[]> {
  const db = await getDB();
  const all = await db.getAll('saved');
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteSavedQuery(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('saved', id);
}
