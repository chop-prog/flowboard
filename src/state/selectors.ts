import type { Card, Column, Priority, State } from './types';

export const PRIORITIES: Priority[] = ['urgent', 'high', 'medium', 'low'];

export interface Filters {
  query: string;
  labelIds: string[];
  priority: Priority | null;
}

export const EMPTY_FILTERS: Filters = { query: '', labelIds: [], priority: null };

export const isFiltering = (f: Filters) => f.query.trim() !== '' || f.labelIds.length > 0 || f.priority !== null;

/** Local-date "yyyy-mm-dd" for comparisons with card.due. */
export function todayISO(now = new Date()): string {
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${m}-${d}`;
}

export function isOverdue(card: Card, today: string, done = false): boolean {
  return !done && card.due !== null && card.due < today;
}

export function matchesFilters(card: Card, f: Filters, state: State): boolean {
  if (f.priority && card.priority !== f.priority) return false;
  if (f.labelIds.length && !f.labelIds.every((id) => card.labelIds.includes(id))) return false;
  const q = f.query.trim().toLowerCase();
  if (!q) return true;
  const labelNames = card.labelIds.map((id) => state.labels[id]?.name ?? '').join(' ');
  return `${card.title} ${card.description} ${labelNames}`.toLowerCase().includes(q);
}

export function boardColumns(state: State, boardId: string): Column[] {
  const board = state.boards[boardId];
  return board ? board.columnIds.map((id) => state.columns[id]).filter((c): c is Column => !!c) : [];
}

export interface BoardStats {
  total: number;
  done: number;
  overdue: number;
  progress: number;
}

export function boardStats(state: State, boardId: string, today: string): BoardStats {
  let total = 0;
  let done = 0;
  let overdue = 0;
  for (const col of boardColumns(state, boardId)) {
    for (const id of col.cardIds) {
      const card = state.cards[id];
      if (!card) continue;
      total++;
      if (col.done) done++;
      else if (isOverdue(card, today)) overdue++;
    }
  }
  return { total, done, overdue, progress: total ? done / total : 0 };
}

/**
 * Subsequence fuzzy match used by the command palette.
 * Returns -1 for no match; higher is better. Rewards consecutive runs and word starts.
 */
export function fuzzyScore(query: string, text: string): number {
  const q = query.toLowerCase().replace(/\s+/g, '');
  const t = text.toLowerCase();
  if (!q) return 0;
  let score = 0;
  let ti = 0;
  let run = 0;
  for (const ch of q) {
    const found = t.indexOf(ch, ti);
    if (found === -1) return -1;
    run = found === ti ? run + 1 : 1;
    const wordStart = found === 0 || /[\s\-_/]/.test(t[found - 1] ?? '');
    score += 1 + run * 2 + (wordStart ? 5 : 0) - Math.min(3, found - ti) * 0.5;
    ti = found + 1;
  }
  // Exact substring beats a scattered match; even more so at a word boundary.
  const sub = t.indexOf(query.toLowerCase().trim());
  if (sub !== -1) score += 20 + (sub === 0 || /\s/.test(t[sub - 1] ?? '') ? 10 : 0);
  return score - t.length * 0.01;
}
