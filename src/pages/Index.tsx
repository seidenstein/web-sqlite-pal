import { useState, useEffect, useRef } from 'react';
import { useSqlite } from '@/hooks/use-sqlite';
import { SchemaPanel } from '@/components/sqlite/SchemaPanel';
import { QueryEditor } from '@/components/sqlite/QueryEditor';
import { ResultsPanel } from '@/components/sqlite/ResultsPanel';
import { HistoryPanel } from '@/components/sqlite/HistoryPanel';
import {
  saveDatabase,
  listDatabases,
  deleteDatabase,
  addHistoryEntry,
  getHistory,
  clearHistory,
  saveQuery,
  getSavedQueries,
  deleteSavedQuery,
} from '@/lib/db-storage';
import type { DatabaseInfo, QueryResult, QueryTab, QueryHistoryEntry, SavedQuery } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Upload,
  X,
  Play,
  Database,
  PanelLeftClose,
  PanelLeft,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function Index() {
  const [databases, setDatabases] = useState<DatabaseInfo[]>([]);
  const [activeDbId, setActiveDbId] = useState<string | null>(null);
  const sqlite = useSqlite();

  const [tabs, setTabs] = useState<QueryTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, QueryResult>>({});
  const tabsRef = useRef<QueryTab[]>([]);
  tabsRef.current = tabs;

  const [showSchema, setShowSchema] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  const [history, setHistoryState] = useState<QueryHistoryEntry[]>([]);
  const [saved, setSaved] = useState<SavedQuery[]>([]);

  useEffect(() => {
    listDatabases().then(dbs => {
      setDatabases(dbs);
      if (dbs.length > 0) {
        switchDatabase(dbs[0]);
      }
    });
    refreshHistoryAndSaved();
  }, []);

  const refreshHistoryAndSaved = async () => {
    const [h, s] = await Promise.all([getHistory(), getSavedQueries()]);
    setHistoryState(h);
    setSaved(s);
  };

  const switchDatabase = async (db: DatabaseInfo) => {
    setActiveDbId(db.id);
    await sqlite.openFile(db.data);
    setTabs(prev => {
      const existingTab = prev.find(t => t.dbId === db.id);
      if (existingTab) {
        setActiveTabId(existingTab.id);
        return prev;
      }
      const newTab: QueryTab = { id: genId(), dbId: db.id, title: 'Query 1', sql: '' };
      setActiveTabId(newTab.id);
      return [...prev, newTab];
    });
  };

  const createNewDatabase = async () => {
    const name = `db-${databases.length + 1}`;
    await sqlite.openEmpty();
    const data = sqlite.exportData();
    if (!data) return;
    const db: DatabaseInfo = { id: genId(), name, data, createdAt: Date.now(), updatedAt: Date.now() };
    await saveDatabase(db);
    setDatabases(prev => [...prev, db]);
    const tab: QueryTab = { id: genId(), dbId: db.id, title: 'Query 1', sql: '' };
    setTabs(prev => [...prev, tab]);
    setActiveDbId(db.id);
    setActiveTabId(tab.id);
    toast.success(`Created "${name}"`);
  };

  const uploadDatabase = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.sqlite,.db,.sqlite3';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const buf = await file.arrayBuffer();
      const data = new Uint8Array(buf);
      await sqlite.openFile(data);
      const db: DatabaseInfo = {
        id: genId(),
        name: file.name.replace(/\.(sqlite3?|db)$/i, ''),
        data,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await saveDatabase(db);
      setDatabases(prev => [...prev, db]);
      const tab: QueryTab = { id: genId(), dbId: db.id, title: 'Query 1', sql: '' };
      setTabs(prev => [...prev, tab]);
      setActiveDbId(db.id);
      setActiveTabId(tab.id);
      toast.success(`Opened "${db.name}"`);
    };
    input.click();
  };

  const removeDatabase = async (id: string) => {
    await deleteDatabase(id);
    setDatabases(prev => prev.filter(d => d.id !== id));
    setTabs(prev => prev.filter(t => t.dbId !== id));
    if (activeDbId === id) {
      const remaining = databases.filter(d => d.id !== id);
      if (remaining.length > 0) {
        switchDatabase(remaining[0]);
      } else {
        setActiveDbId(null);
        setActiveTabId(null);
        sqlite.close();
      }
    }
  };

  const activeTab = tabs.find(t => t.id === activeTabId);

  const updateTabSql = (sql: string) => {
    if (!activeTabId) return;
    setTabs(prev => prev.map(t => (t.id === activeTabId ? { ...t, sql } : t)));
  };

  const addTab = () => {
    if (!activeDbId) return;
    const dbTabs = tabs.filter(t => t.dbId === activeDbId);
    const tab: QueryTab = { id: genId(), dbId: activeDbId, title: `Query ${dbTabs.length + 1}`, sql: '' };
    setTabs(prev => [...prev, tab]);
    setActiveTabId(tab.id);
  };

  const closeTab = (tabId: string) => {
    setTabs(prev => {
      const next = prev.filter(t => t.id !== tabId);
      if (activeTabId === tabId) {
        const dbTabs = next.filter(t => t.dbId === activeDbId);
        setActiveTabId(dbTabs.length > 0 ? dbTabs[dbTabs.length - 1].id : null);
      }
      return next;
    });
  };

  const executeQuery = async () => {
    console.log('[executeQuery] activeDbId:', activeDbId, 'activeTabId:', activeTabId);
    console.log('[executeQuery] tabs:', JSON.stringify(tabs.map(t => ({ id: t.id, sql: t.sql.slice(0, 50) }))));
    if (!activeDbId || !activeTabId) return;
    const currentTab = tabsRef.current.find(t => t.id === activeTabId);
    if (!currentTab) { console.log('[executeQuery] tab not found'); return; }
    const sqlText = currentTab.sql.trim();
    if (!sqlText) { console.log('[executeQuery] sql is empty'); return; }
    console.log('[executeQuery] executing:', sqlText);
    const result = sqlite.execute(sqlText);
    console.log('[executeQuery] result:', JSON.stringify({ columns: result.columns, rowCount: result.values?.length, error: result.error }));
    setResults(prev => ({ ...prev, [currentTab.id]: result }));
    const entry: QueryHistoryEntry = {
      id: genId(), dbId: activeDbId, sql: sqlText,
      executedAt: Date.now(), rowCount: result.values?.length ?? 0, error: result.error,
    };
    await addHistoryEntry(entry);
    refreshHistoryAndSaved();
    if (!result.error) {
      const data = sqlite.exportData();
      if (data) {
        const db = databases.find(d => d.id === activeDbId);
        if (db) {
          const updated = { ...db, data, updatedAt: Date.now() };
          await saveDatabase(updated);
          setDatabases(prev => prev.map(d => (d.id === activeDbId ? updated : d)));
        }
      }
    }
  };

  const handleTableClick = (tableName: string) => {
    if (!activeTabId) return;
    updateTabSql(`SELECT * FROM "${tableName}" LIMIT 100;`);
  };

  const handleSaveQuery = (sqlText: string) => {
    const name = sqlText.slice(0, 40) || 'Untitled';
    const sq: SavedQuery = { id: genId(), name, sql: sqlText, dbId: activeDbId ?? undefined, createdAt: Date.now() };
    saveQuery(sq).then(refreshHistoryAndSaved);
    toast.success('Query saved');
  };

  const handleRunFromHistory = (sqlText: string) => {
    if (!activeTabId) return;
    updateTabSql(sqlText);
  };

  const handleClearHistory = () => {
    clearHistory().then(refreshHistoryAndSaved);
    toast.success('History cleared');
  };

  const handleDeleteSaved = (id: string) => {
    deleteSavedQuery(id).then(refreshHistoryAndSaved);
  };

  const dbTabs = tabs.filter(t => t.dbId === activeDbId);
  const currentResult = activeTabId ? results[activeTabId] ?? null : null;

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-2 border-b border-border bg-card">
        <h1 className="text-sm font-bold tracking-tight text-foreground">
          <Database className="h-4 w-4 inline mr-1.5 -mt-0.5" />
          SeidenSQLite
        </h1>
        <div className="flex items-center gap-1 ml-4">
          {databases.map(db => (
            <button
              key={db.id}
              onClick={() => switchDatabase(db)}
              className={`group flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors ${
                db.id === activeDbId
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {db.name}
              <X
                className="h-3 w-3 opacity-0 group-hover:opacity-100 hover:text-destructive"
                onClick={e => { e.stopPropagation(); removeDatabase(db.id); }}
              />
            </button>
          ))}
        </div>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={createNewDatabase}>
          <Plus className="h-3 w-3 mr-1" /> New
        </Button>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={uploadDatabase}>
          <Upload className="h-3 w-3 mr-1" /> Open
        </Button>
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7" onClick={() => setShowSchema(s => !s)}>
            {showSchema ? <PanelLeftClose className="h-3.5 w-3.5" /> : <PanelLeft className="h-3.5 w-3.5" />}
          </Button>
          <Button variant={showHistory ? 'secondary' : 'ghost'} size="sm" className="h-7" onClick={() => setShowHistory(s => !s)}>
            <Clock className="h-3.5 w-3.5" />
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {showSchema && (
          <aside className="w-56 border-r border-border bg-card overflow-auto flex-shrink-0">
            <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
              Schema
            </div>
            <SchemaPanel schema={sqlite.schema} onTableClick={handleTableClick} />
          </aside>
        )}

        <main className="flex-1 flex flex-col overflow-hidden">
          {activeDbId ? (
            <>
              <div className="flex items-center border-b border-border bg-muted/30 px-1">
                {dbTabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTabId(tab.id)}
                    className={`group flex items-center gap-1 px-3 py-1.5 text-xs border-r border-border transition-colors ${
                      tab.id === activeTabId ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab.title}
                    {dbTabs.length > 1 && (
                      <X className="h-3 w-3 opacity-0 group-hover:opacity-100" onClick={e => { e.stopPropagation(); closeTab(tab.id); }} />
                    )}
                  </button>
                ))}
                <button onClick={addTab} className="px-2 py-1.5 text-muted-foreground hover:text-foreground transition-colors">
                  <Plus className="h-3 w-3" />
                </button>
                <div className="ml-auto pr-2">
                  <Button size="sm" className="h-7 text-xs" onClick={executeQuery} disabled={!activeTab?.sql.trim()}>
                    <Play className="h-3 w-3 mr-1" /> Run
                  </Button>
                </div>
              </div>
              <div className="h-[40%] min-h-[120px] border-b border-border">
                {activeTab && (
                  <QueryEditor value={activeTab.sql} onChange={updateTabSql} onExecute={executeQuery} error={currentResult?.error} />
                )}
              </div>
              <div className="flex-1 overflow-hidden">
                <ResultsPanel result={currentResult} />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-4">
                <Database className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <div>
                  <h2 className="text-lg font-semibold text-foreground">SeidenSQLite</h2>
                  <p className="text-sm text-muted-foreground mt-1">A browser-based SQLite client for learning SQL</p>
                </div>
                <div className="flex gap-3 justify-center">
                  <Button onClick={createNewDatabase}><Plus className="h-4 w-4 mr-2" /> New Database</Button>
                  <Button variant="outline" onClick={uploadDatabase}><Upload className="h-4 w-4 mr-2" /> Open File</Button>
                </div>
              </div>
            </div>
          )}
        </main>

        {showHistory && (
          <aside className="w-64 border-l border-border bg-card overflow-hidden flex-shrink-0">
            <HistoryPanel
              history={history} savedQueries={saved} onRunQuery={handleRunFromHistory}
              onSaveQuery={handleSaveQuery} onDeleteSaved={handleDeleteSaved} onClearHistory={handleClearHistory}
            />
          </aside>
        )}
      </div>
    </div>
  );
}
