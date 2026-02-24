import { QueryResult } from '@/lib/types';
import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from 'recharts';
import { Copy, Download, BarChart3, TableIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ResultsPanelProps {
  result: QueryResult | null;
}

type ViewMode = 'table' | 'chart';

export function ResultsPanel({ result }: ResultsPanelProps) {
  const [view, setView] = useState<ViewMode>('table');

  if (!result) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        Run a query to see results (Ctrl+Enter)
      </div>
    );
  }

  if (result.error) {
    return (
      <div className="p-4 text-sm text-destructive">
        <strong>Error:</strong> {result.error}
      </div>
    );
  }

  const columns = result.columns ?? [];
  const values = result.values ?? [];

  if (columns.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
        Query executed successfully. No rows returned.
      </div>
    );
  }

  const copyToClipboard = () => {
    const header = columns.join('\t');
    const rows = values.map(r => r.join('\t')).join('\n');
    navigator.clipboard.writeText(`${header}\n${rows}`);
    toast.success('Copied to clipboard');
  };

  const downloadCSV = () => {
    const escape = (v: any) => {
      const s = String(v ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = columns.map(escape).join(',');
    const rows = values.map(r => r.map(escape).join(',')).join('\n');
    const blob = new Blob([`${header}\n${rows}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'query-result.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded');
  };

  const downloadJSON = () => {
    const data = values.map(row => Object.fromEntries(columns.map((col, i) => [col, row[i]])));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'query-result.json';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('JSON downloaded');
  };

  const numericCols = columns.filter((_, i) => values.every(r => r[i] === null || typeof r[i] === 'number'));
  const labelCol = columns.find((_, i) => values.some(r => typeof r[i] === 'string'));
  const canChart = numericCols.length > 0;
  const chartData = values.slice(0, 100).map(row => Object.fromEntries(columns.map((col, i) => [col, row[i]])));

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border bg-muted/30">
        <span className="text-xs text-muted-foreground mr-auto">
          {values.length} row{values.length !== 1 ? 's' : ''}
        </span>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={copyToClipboard}>
          <Copy className="h-3 w-3 mr-1" /> Copy
        </Button>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={downloadCSV}>
          <Download className="h-3 w-3 mr-1" /> CSV
        </Button>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={downloadJSON}>
          <Download className="h-3 w-3 mr-1" /> JSON
        </Button>
        {canChart && (
          <>
            <div className="w-px h-4 bg-border mx-1" />
            <Button
              variant={view === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setView('table')}
            >
              <TableIcon className="h-3 w-3" />
            </Button>
            <Button
              variant={view === 'chart' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setView('chart')}
            >
              <BarChart3 className="h-3 w-3" />
            </Button>
          </>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        {view === 'table' ? (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-muted">
              <tr>
                {columns.map(col => (
                  <th key={col} className="text-left px-3 py-1.5 font-medium text-foreground border-b border-border">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {values.map((row, i) => (
                <tr key={i} className="hover:bg-accent/30 border-b border-border/50">
                  {row.map((val, j) => (
                    <td key={j} className="px-3 py-1 text-foreground font-mono">
                      {val === null ? <span className="text-muted-foreground italic">NULL</span> : String(val)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-4 h-full min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              {numericCols.length === 1 ? (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214.3 31.8% 91.4%)" />
                  <XAxis dataKey={labelCol || columns[0]} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey={numericCols[0]} fill="hsl(222.2 47.4% 11.2%)" radius={[3, 3, 0, 0]} />
                </BarChart>
              ) : (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214.3 31.8% 91.4%)" />
                  <XAxis dataKey={labelCol || columns[0]} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  {numericCols.slice(0, 5).map((col, i) => (
                    <Line
                      key={col}
                      type="monotone"
                      dataKey={col}
                      stroke={['hsl(222 47% 11%)', 'hsl(210 80% 50%)', 'hsl(150 60% 40%)', 'hsl(30 80% 50%)', 'hsl(0 70% 50%)'][i]}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
