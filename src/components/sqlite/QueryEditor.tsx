import { useEffect, useRef, useCallback } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { sql, SQLite } from '@codemirror/lang-sql';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching } from '@codemirror/language';
import { closeBrackets } from '@codemirror/autocomplete';

interface QueryEditorProps {
  value: string;
  onChange: (value: string) => void;
  onExecute: () => void;
  error?: string;
}

const lightTheme = EditorView.theme({
  '&': { fontSize: '13px', height: '100%' },
  '.cm-content': {
    fontFamily: '"SF Mono", "Fira Code", "Fira Mono", Menlo, monospace',
    padding: '8px 0',
  },
  '.cm-gutters': {
    backgroundColor: 'hsl(210 40% 96.1%)',
    borderRight: '1px solid hsl(214.3 31.8% 91.4%)',
    color: 'hsl(215.4 16.3% 46.9%)',
  },
  '.cm-activeLineGutter': { backgroundColor: 'hsl(210 40% 93%)' },
  '.cm-activeLine': { backgroundColor: 'hsl(210 40% 97%)' },
  '.cm-selectionBackground': { backgroundColor: 'hsl(222.2 47.4% 11.2% / 0.1) !important' },
  '&.cm-focused .cm-selectionBackground': { backgroundColor: 'hsl(222.2 47.4% 11.2% / 0.15) !important' },
});

export function QueryEditor({ value, onChange, onExecute, error }: QueryEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onExecuteRef = useRef(onExecute);
  onChangeRef.current = onChange;
  onExecuteRef.current = onExecute;

  useEffect(() => {
    if (!containerRef.current) return;

    const runKeymap = keymap.of([
      {
        key: 'Ctrl-Enter',
        mac: 'Cmd-Enter',
        run: () => { onExecuteRef.current(); return true; },
      },
    ]);

    const state = EditorState.create({
      doc: value,
      extensions: [
        runKeymap,
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        history(),
        bracketMatching(),
        closeBrackets(),
        sql({ dialect: SQLite }),
        syntaxHighlighting(defaultHighlightStyle),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        lightTheme,
        EditorView.updateListener.of(update => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
        EditorView.lineWrapping,
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  const setExternally = useCallback((newVal: string) => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== newVal) {
      view.dispatch({ changes: { from: 0, to: current.length, insert: newVal } });
    }
  }, []);

  useEffect(() => {
    setExternally(value);
  }, [value, setExternally]);

  return (
    <div className="flex flex-col h-full">
      <div ref={containerRef} className="flex-1 overflow-auto border border-border rounded-md" />
      {error && (
        <div className="mt-1 px-3 py-1.5 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded">
          {error}
        </div>
      )}
    </div>
  );
}
