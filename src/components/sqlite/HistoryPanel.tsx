import { QueryHistoryEntry, SavedQuery } from '@/lib/types';
import { Clock, Star, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface HistoryPanelProps {
  history: QueryHistoryEntry[];
  savedQueries: SavedQuery[];
  onRunQuery: (sql: string) => void;
  onSaveQuery: (sql: string) => void;
  onDeleteSaved: (id: string) => void;
  onClearHistory: () => void;
}

export function HistoryPanel({
  history,
  savedQueries,
  onRunQuery,
  onSaveQuery,
  onDeleteSaved,
  onClearHistory,
}: HistoryPanelProps) {
  const [tab, setTab] = useState<'history' | 'saved'>('history');

  return (
    <div className="flex flex-col h-full text-sm">
      <div className="flex border-b border-border">
        <button
          onClick={() => setTab('history')}
          className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
            tab === 'history'
              ? 'text-foreground border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Clock className="h-3 w-3 inline mr-1" />
          History
        </button>
        <button
          onClick={() => setTab('saved')}
          className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
            tab === 'saved'
              ? 'text-foreground border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Star className="h-3 w-3 inline mr-1" />
          Saved
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {tab === 'history' ? (
          <>
            {history.length > 0 && (
              <div className="px-3 py-1.5 border-b border-border">
                <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground" onClick={onClearHistory}>
                  Clear all
                </Button>
              </div>
            )}
            {history.length === 0 ? (
              <div className="p-3 text-muted-foreground text-xs">No queries yet.</div>
            ) : (
              history.map(entry => (
                <div
                  key={entry.id}
                  className="px-3 py-2 border-b border-border/50 hover:bg-accent/30 group cursor-pointer"
                  onClick={() => onRunQuery(entry.sql)}
                >
                  <pre className="text-xs font-mono text-foreground truncate whitespace-pre-wrap line-clamp-2">
                    {entry.sql}
                  </pre>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                    <span>{new Date(entry.executedAt).toLocaleTimeString()}</span>
                    {entry.error ? (
                      <span className="text-destructive">Error</span>
                    ) : (
                      <span>{entry.rowCount} rows</span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 ml-auto opacity-0 group-hover:opacity-100"
                      onClick={e => { e.stopPropagation(); onSaveQuery(entry.sql); }}
                    >
                      <Star className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </>
        ) : (
          <>
            {savedQueries.length === 0 ? (
              <div className="p-3 text-muted-foreground text-xs">
                No saved queries. Click ⭐ on a history entry to save it.
              </div>
            ) : (
              savedQueries.map(sq => (
                <div
                  key={sq.id}
                  className="px-3 py-2 border-b border-border/50 hover:bg-accent/30 group cursor-pointer"
                  onClick={() => onRunQuery(sq.sql)}
                >
                  <div className="text-xs font-medium text-foreground">{sq.name}</div>
                  <pre className="text-[11px] font-mono text-muted-foreground truncate mt-0.5">{sq.sql}</pre>
                  <div className="flex items-center mt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 ml-auto opacity-0 group-hover:opacity-100 text-destructive"
                      onClick={e => { e.stopPropagation(); onDeleteSaved(sq.id); }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
