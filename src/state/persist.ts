import type { State } from './types';

const KEY = 'flowboard:v1';

export const uid = () =>
  globalThis.crypto?.randomUUID?.().slice(0, 8) ?? Math.random().toString(36).slice(2, 10);

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStrArr = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');

/**
 * Structural validation for imported/persisted data. Checks shape and referential
 * integrity (every referenced id exists) so a bad file can never crash the UI.
 */
export function isValidState(v: unknown): v is State {
  if (!isObj(v) || v.version !== 1) return false;
  const { boards, boardOrder, columns, cards, labels, activeBoardId } = v;
  if (!isObj(boards) || !isObj(columns) || !isObj(cards) || !isObj(labels)) return false;
  if (!isStrArr(boardOrder) || boardOrder.length === 0 || typeof activeBoardId !== 'string') return false;
  if (!boardOrder.every((id) => isObj(boards[id]))) return false;
  if (!isObj(boards[activeBoardId])) return false;
  for (const b of Object.values(boards)) {
    if (!isObj(b) || typeof b.name !== 'string' || !isStrArr(b.columnIds)) return false;
    if (!b.columnIds.every((id) => isObj(columns[id]))) return false;
  }
  for (const c of Object.values(columns)) {
    if (!isObj(c) || typeof c.title !== 'string' || !isStrArr(c.cardIds)) return false;
    if (!c.cardIds.every((id) => isObj(cards[id]))) return false;
  }
  for (const c of Object.values(cards)) {
    if (!isObj(c) || typeof c.title !== 'string' || !isStrArr(c.labelIds) || !Array.isArray(c.checklist)) return false;
  }
  return true;
}

export function loadState(): State | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValidState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveState(state: State): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* quota or privacy mode — the app keeps working in memory */
  }
}
