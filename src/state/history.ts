import type { Action, State } from './types';
import { reducer } from './reducer';

export interface History {
  past: State[];
  present: State;
  future: State[];
}

export type HistoryAction = Action | { type: 'history/undo' } | { type: 'history/redo' };

const LIMIT = 100;
/** Navigation isn't an edit — it shouldn't be undoable. */
const NOT_UNDOABLE = new Set<Action['type']>(['board/select']);

export const createHistory = (present: State): History => ({ past: [], present, future: [] });

/** Undo/redo wrapper around the domain reducer. States are immutable, so snapshots are cheap. */
export function historyReducer(h: History, action: HistoryAction): History {
  if (action.type === 'history/undo') {
    const prev = h.past[h.past.length - 1];
    if (!prev) return h;
    // Keep the user on the board they're looking at when the board still exists.
    const present = prev.boards[h.present.activeBoardId] ? { ...prev, activeBoardId: h.present.activeBoardId } : prev;
    return { past: h.past.slice(0, -1), present, future: [h.present, ...h.future] };
  }
  if (action.type === 'history/redo') {
    const next = h.future[0];
    if (!next) return h;
    return { past: [...h.past, h.present].slice(-LIMIT), present: next, future: h.future.slice(1) };
  }
  const present = reducer(h.present, action);
  if (present === h.present) return h;
  if (NOT_UNDOABLE.has(action.type)) return { ...h, present };
  return { past: [...h.past, h.present].slice(-LIMIT), present, future: [] };
}
