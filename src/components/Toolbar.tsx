import type { CSSProperties, RefObject } from 'react';
import { useStore } from '../state/store';
import { boardStats, isFiltering, PRIORITIES, type Filters } from '../state/selectors';
import type { Priority } from '../state/types';
import { Icon } from './Icon';

interface Props {
  filters: Filters;
  setFilters: (f: Filters) => void;
  searchRef: RefObject<HTMLInputElement | null>;
  today: string;
  onPalette: () => void;
  onMenu: () => void;
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
export const MOD = isMac ? '⌘' : 'Ctrl';

export function Toolbar({ filters, setFilters, searchRef, today, onPalette, onMenu }: Props) {
  const { state, dispatch, canUndo, canRedo } = useStore();
  const board = state.boards[state.activeBoardId]!;
  const stats = boardStats(state, board.id, today);
  const pct = Math.round(stats.progress * 100);

  return (
    <header className="toolbar">
      <div className="toolbar-row">
        <button className="icon-btn menu-btn" aria-label="Open boards" onClick={onMenu}>
          <Icon name="menu" />
        </button>
        <span className="board-emoji" aria-hidden="true">{board.emoji}</span>
        <input
          key={board.id + board.name}
          className="board-name"
          defaultValue={board.name}
          aria-label="Board name"
          onBlur={(e) => e.target.value.trim() !== board.name && dispatch({ type: 'board/rename', id: board.id, name: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        />
        <div className="stats" aria-label={`${pct}% complete, ${stats.overdue} overdue`}>
          <span className="ring" style={{ '--p': `${pct}%` } as CSSProperties}>
            <span>{pct}%</span>
          </span>
          <span className="stat-text">
            <b>{stats.done}</b>/{stats.total} done
            {stats.overdue > 0 && <em className="overdue"> · {stats.overdue} overdue</em>}
          </span>
        </div>
        <div className="spacer" />
        <div className="history">
          <button className="icon-btn" aria-label="Undo" title={`Undo (${MOD}+Z)`} disabled={!canUndo} onClick={() => dispatch({ type: 'history/undo' })}>
            <Icon name="undo" />
          </button>
          <button className="icon-btn" aria-label="Redo" title={`Redo (${MOD}+Shift+Z)`} disabled={!canRedo} onClick={() => dispatch({ type: 'history/redo' })}>
            <Icon name="redo" />
          </button>
        </div>
        <button className="palette-btn" onClick={onPalette}>
          <Icon name="command" /> <span>Commands</span> <kbd>{MOD} K</kbd>
        </button>
      </div>

      <div className="toolbar-row filters">
        <label className="search">
          <Icon name="search" />
          <input
            ref={searchRef}
            type="search"
            placeholder="Filter cards…"
            value={filters.query}
            onChange={(e) => setFilters({ ...filters, query: e.target.value })}
            onKeyDown={(e) => e.key === 'Escape' && (setFilters({ ...filters, query: '' }), e.currentTarget.blur())}
            aria-label="Filter cards"
          />
          <kbd>/</kbd>
        </label>
        <div className="chips" role="group" aria-label="Filter by label">
          {Object.values(state.labels).map((l) => {
            const on = filters.labelIds.includes(l.id);
            return (
              <button
                key={l.id}
                className={`pill toggle ${on ? 'on' : ''}`}
                style={{ '--c': l.color } as CSSProperties}
                aria-pressed={on}
                onClick={() => setFilters({ ...filters, labelIds: on ? filters.labelIds.filter((x) => x !== l.id) : [...filters.labelIds, l.id] })}
              >
                {l.name}
              </button>
            );
          })}
        </div>
        <select
          className="prio-select"
          aria-label="Filter by priority"
          value={filters.priority ?? ''}
          onChange={(e) => setFilters({ ...filters, priority: (e.target.value || null) as Priority | null })}
        >
          <option value="">Any priority</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{p[0]!.toUpperCase() + p.slice(1)}</option>)}
        </select>
        {isFiltering(filters) && (
          <button className="clear-filters" onClick={() => setFilters({ query: '', labelIds: [], priority: null })}>
            Clear <span className="muted">· drag & drop paused while filtering</span>
          </button>
        )}
      </div>
    </header>
  );
}
