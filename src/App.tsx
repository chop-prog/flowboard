import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from './state/store';
import { boardColumns, EMPTY_FILTERS, todayISO, type Filters } from './state/selectors';
import { isValidState, uid } from './state/persist';
import { Sidebar } from './components/Sidebar';
import { Toolbar, MOD } from './components/Toolbar';
import { BoardView } from './components/BoardView';
import { CardModal } from './components/CardModal';
import { CommandPalette, type Command } from './components/CommandPalette';

type Theme = 'light' | 'dark';
const initialTheme = (): Theme => {
  try {
    const saved = localStorage.getItem('flowboard:theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch { /* ignore */ }
  return matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));

export default function App() {
  const { state, dispatch } = useStore();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [openCard, setOpenCard] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [toast, setToast] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const today = todayISO();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('flowboard:theme', theme); } catch { /* ignore */ }
  }, [theme]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  // Close the card editor if its card disappears (deleted, undone, board switched).
  useEffect(() => {
    if (openCard && !state.cards[openCard]) setOpenCard(null);
  }, [openCard, state.cards]);

  const newCard = useCallback((columnId?: string) => {
    const col = columnId ?? boardColumns(state, state.activeBoardId)[0]?.id;
    if (!col) return;
    const id = uid();
    dispatch({ type: 'card/add', columnId: col, id, title: 'Untitled card', createdAt: Date.now(), index: 0 });
    setOpenCard(id);
  }, [state, dispatch]);

  const exportJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `flowboard-${today}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setToast('Exported workspace as JSON');
  }, [state, today]);

  const importJson = async (file: File) => {
    try {
      const data: unknown = JSON.parse(await file.text());
      if (!isValidState(data)) throw new Error('invalid');
      dispatch({ type: 'state/replace', state: data });
      setToast(`Imported ${file.name} — ${MOD}+Z to undo`);
    } catch {
      setToast('That file is not a valid Flowboard export');
    }
  };

  // Global keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      if (mod && key === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      if (isTyping(e.target) || document.querySelector('dialog[open]')) return;
      if (mod && key === 'z') {
        e.preventDefault();
        dispatch({ type: e.shiftKey ? 'history/redo' : 'history/undo' });
      } else if (mod && key === 'y') {
        e.preventDefault();
        dispatch({ type: 'history/redo' });
      } else if (!mod && key === 'n') {
        e.preventDefault();
        newCard();
      } else if (!mod && key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (!mod && (key === '[' || key === ']')) {
        const i = state.boardOrder.indexOf(state.activeBoardId);
        const next = state.boardOrder[(i + (key === ']' ? 1 : -1) + state.boardOrder.length) % state.boardOrder.length];
        if (next) dispatch({ type: 'board/select', id: next });
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [dispatch, newCard, state.boardOrder, state.activeBoardId]);

  const commands = useMemo<Command[]>(() => {
    const cols = boardColumns(state, state.activeBoardId);
    const list: Command[] = [
      { id: 'new-card', title: 'New card', section: 'Actions', icon: 'plus', shortcut: 'N', run: () => newCard() },
      ...cols.map((c) => ({ id: `new-in-${c.id}`, title: `New card in “${c.title}”`, section: 'Actions', icon: 'plus' as const, run: () => newCard(c.id) })),
      { id: 'search', title: 'Filter cards', section: 'Actions', icon: 'search', shortcut: '/', run: () => searchRef.current?.focus() },
      { id: 'undo', title: 'Undo', section: 'Edit', icon: 'undo', shortcut: `${MOD} Z`, run: () => dispatch({ type: 'history/undo' }) },
      { id: 'redo', title: 'Redo', section: 'Edit', icon: 'redo', shortcut: `${MOD} ⇧ Z`, run: () => dispatch({ type: 'history/redo' }) },
      { id: 'theme', title: `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`, section: 'Preferences', icon: theme === 'dark' ? 'sun' : 'moon', run: () => setTheme(theme === 'dark' ? 'light' : 'dark') },
      { id: 'export', title: 'Export workspace as JSON', section: 'Data', icon: 'download', run: exportJson },
      { id: 'import', title: 'Import workspace from JSON', section: 'Data', icon: 'upload', run: () => fileRef.current?.click() },
      ...state.boardOrder.map((id) => ({
        id: `board-${id}`, title: `Go to ${state.boards[id]!.emoji} ${state.boards[id]!.name}`, section: 'Boards', icon: 'menu' as const,
        run: () => dispatch({ type: 'board/select', id }),
      })),
    ];
    for (const col of cols) {
      for (const cid of col.cardIds) {
        const card = state.cards[cid];
        if (card) list.push({ id: `card-${cid}`, title: card.title, section: 'Cards', icon: 'text', run: () => setOpenCard(cid) });
      }
    }
    return list;
  }, [state, theme, newCard, exportJson, dispatch]);

  return (
    <div className="app">
      <Sidebar
        today={today}
        theme={theme}
        open={sidebarOpen}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        onExport={exportJson}
        onImport={() => fileRef.current?.click()}
        onNavigate={() => setSidebarOpen(false)}
      />
      {sidebarOpen && <div className="scrim" onClick={() => setSidebarOpen(false)} aria-hidden="true" />}
      <main className="main">
        <Toolbar
          filters={filters}
          setFilters={setFilters}
          searchRef={searchRef}
          today={today}
          onPalette={() => setPaletteOpen(true)}
          onMenu={() => setSidebarOpen(true)}
        />
        <BoardView filters={filters} today={today} onOpenCard={setOpenCard} />
      </main>

      <CardModal cardId={openCard} onClose={() => setOpenCard(null)} />
      <CommandPalette open={paletteOpen} commands={commands} onClose={() => setPaletteOpen(false)} />

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void importJson(f);
          e.target.value = '';
        }}
      />
      <div className={`toast ${toast ? 'show' : ''}`} role="status" aria-live="polite">{toast}</div>
    </div>
  );
}
