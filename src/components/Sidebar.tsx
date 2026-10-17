import { useState } from 'react';
import { useStore } from '../state/store';
import { boardStats } from '../state/selectors';
import { uid } from '../state/persist';
import { Icon } from './Icon';

const EMOJIS = ['✨', '📦', '🎯', '🧪', '📚', '🛠️', '🎨', '🌍'];

interface Props {
  today: string;
  theme: 'light' | 'dark';
  open: boolean;
  onToggleTheme: () => void;
  onExport: () => void;
  onImport: () => void;
  onNavigate: () => void;
}

export function Sidebar({ today, theme, open, onToggleTheme, onExport, onImport, onNavigate }: Props) {
  const { state, dispatch } = useStore();
  const [adding, setAdding] = useState(false);

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Boards">
      <div className="brand">
        <span className="logo" aria-hidden="true" />
        Flowboard
      </div>

      <nav>
        <h3>Boards</h3>
        <ul>
          {state.boardOrder.map((id) => {
            const b = state.boards[id]!;
            const s = boardStats(state, id, today);
            return (
              <li key={id}>
                <button
                  className={`board-link ${id === state.activeBoardId ? 'active' : ''}`}
                  aria-current={id === state.activeBoardId ? 'page' : undefined}
                  onClick={() => {
                    dispatch({ type: 'board/select', id });
                    onNavigate();
                  }}
                >
                  <span className="emoji" aria-hidden="true">{b.emoji}</span>
                  <span className="name">{b.name}</span>
                  <span className="mini-progress" title={`${Math.round(s.progress * 100)}% done`}>
                    <i style={{ width: `${s.progress * 100}%` }} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {adding ? (
          <form
            className="new-board"
            onSubmit={(e) => {
              e.preventDefault();
              const name = String(new FormData(e.currentTarget).get('name') ?? '').trim();
              if (name) {
                const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)]!;
                dispatch({ type: 'board/add', id: uid(), name, emoji, columnIds: [uid(), uid(), uid()] });
                onNavigate();
              }
              setAdding(false);
            }}
          >
            <input name="name" autoFocus placeholder="Board name" aria-label="New board name" onBlur={() => setAdding(false)}
              onKeyDown={(e) => e.key === 'Escape' && setAdding(false)} />
          </form>
        ) : (
          <button className="ghost-row" onClick={() => setAdding(true)}>
            <Icon name="plus" /> New board
          </button>
        )}
      </nav>

      <div className="sidebar-foot">
        <button className="ghost-row" onClick={onToggleTheme}>
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} /> {theme === 'dark' ? 'Light' : 'Dark'} theme
        </button>
        <button className="ghost-row" onClick={onExport}>
          <Icon name="download" /> Export JSON
        </button>
        <button className="ghost-row" onClick={onImport}>
          <Icon name="upload" /> Import JSON
        </button>
        {state.boardOrder.length > 1 && (
          <button
            className="ghost-row danger"
            onClick={() => {
              const b = state.boards[state.activeBoardId];
              if (b && window.confirm(`Delete “${b.name}”? You can undo this with Ctrl+Z.`)) dispatch({ type: 'board/delete', id: b.id });
            }}
          >
            <Icon name="trash" /> Delete board
          </button>
        )}
      </div>
    </aside>
  );
}
