import { TableSchema } from '@/lib/types';
import { Table, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface SchemaPanelProps {
  schema: TableSchema[];
  onTableClick?: (tableName: string) => void;
}

export function SchemaPanel({ schema, onTableClick }: SchemaPanelProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (name: string) => {
    setExpanded(prev => ({ ...prev, [name]: !prev[name] }));
  };

  if (schema.length === 0) {
    return (
      <div className="p-3 text-sm text-muted-foreground">
        No tables yet. Run a CREATE TABLE statement to get started.
      </div>
    );
  }

  return (
    <div className="text-sm">
      {schema.map(table => (
        <div key={table.name} className="border-b border-border">
          <button
            onClick={() => toggle(table.name)}
            className="flex items-center gap-1.5 w-full px-3 py-2 hover:bg-accent/50 transition-colors text-left"
          >
            <ChevronRight
              className={`h-3 w-3 text-muted-foreground transition-transform ${expanded[table.name] ? 'rotate-90' : ''}`}
            />
            <Table className="h-3.5 w-3.5 text-primary" />
            <span
              className="font-medium text-foreground cursor-pointer hover:underline"
              onClick={e => { e.stopPropagation(); onTableClick?.(table.name); }}
            >
              {table.name}
            </span>
            <span className="text-muted-foreground ml-auto text-xs">{table.columns.length}</span>
          </button>
          {expanded[table.name] && (
            <div className="pl-8 pr-3 pb-2 space-y-0.5">
              {table.columns.map(col => (
                <div key={col.name} className="flex items-center gap-2 text-xs py-0.5">
                  <span className="text-foreground">
                    {col.pk ? '🔑 ' : ''}{col.name}
                  </span>
                  <span className="text-muted-foreground uppercase text-[10px]">
                    {col.type || 'any'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
