import type { Action, Board, Card, Column, State } from './types';

/** Move an array element; returns a new array. */
export function arrayMove<T>(list: readonly T[], from: number, to: number): T[] {
  const next = list.slice();
  const [item] = next.splice(from, 1);
  if (item === undefined) return next;
  next.splice(Math.max(0, Math.min(to, next.length)), 0, item);
  return next;
}

function omit<T>(record: Record<string, T>, keys: Iterable<string>): Record<string, T> {
  const next = { ...record };
  for (const k of keys) delete next[k];
  return next;
}

function columnOf(state: State, cardId: string): Column | undefined {
  return Object.values(state.columns).find((c) => c.cardIds.includes(cardId));
}

function updateCard(state: State, id: string, fn: (c: Card) => Card): State {
  const card = state.cards[id];
  return card ? { ...state, cards: { ...state.cards, [id]: fn(card) } } : state;
}

function updateColumn(state: State, id: string, fn: (c: Column) => Column): State {
  const col = state.columns[id];
  return col ? { ...state, columns: { ...state.columns, [id]: fn(col) } } : state;
}

function updateBoard(state: State, id: string, fn: (b: Board) => Board): State {
  const board = state.boards[id];
  return board ? { ...state, boards: { ...state.boards, [id]: fn(board) } } : state;
}

/** Pure, immutable reducer for the whole workspace. Unknown ids are no-ops. */
export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'board/add': {
      const columns = { ...state.columns };
      const titles = ['To do', 'In progress', 'Done'];
      action.columnIds.forEach((id, i) => {
        columns[id] = { id, title: titles[i] ?? `Column ${i + 1}`, cardIds: [], wipLimit: null, done: i === titles.length - 1 };
      });
      return {
        ...state,
        columns,
        boards: { ...state.boards, [action.id]: { id: action.id, name: action.name, emoji: action.emoji, columnIds: action.columnIds } },
        boardOrder: [...state.boardOrder, action.id],
        activeBoardId: action.id,
      };
    }
    case 'board/rename':
      return updateBoard(state, action.id, (b) => ({ ...b, name: action.name.trim() || b.name }));
    case 'board/delete': {
      const board = state.boards[action.id];
      if (!board || state.boardOrder.length <= 1) return state;
      const cardIds = board.columnIds.flatMap((cid) => state.columns[cid]?.cardIds ?? []);
      const boardOrder = state.boardOrder.filter((id) => id !== action.id);
      return {
        ...state,
        boards: omit(state.boards, [action.id]),
        boardOrder,
        columns: omit(state.columns, board.columnIds),
        cards: omit(state.cards, cardIds),
        activeBoardId: state.activeBoardId === action.id ? boardOrder[0]! : state.activeBoardId,
      };
    }
    case 'board/select':
      return state.boards[action.id] ? { ...state, activeBoardId: action.id } : state;

    case 'column/add': {
      if (!state.boards[action.boardId]) return state;
      const col: Column = { id: action.id, title: action.title, cardIds: [], wipLimit: null, done: false };
      return updateBoard({ ...state, columns: { ...state.columns, [col.id]: col } }, action.boardId, (b) => ({
        ...b,
        columnIds: [...b.columnIds, col.id],
      }));
    }
    case 'column/update':
      return updateColumn(state, action.id, (c) => ({ ...c, ...action.patch }));
    case 'column/delete': {
      const col = state.columns[action.id];
      if (!col) return state;
      const next = updateBoard(state, action.boardId, (b) => ({ ...b, columnIds: b.columnIds.filter((id) => id !== action.id) }));
      return { ...next, columns: omit(next.columns, [action.id]), cards: omit(next.cards, col.cardIds) };
    }
    case 'column/move':
      return updateBoard(state, action.boardId, (b) => ({ ...b, columnIds: arrayMove(b.columnIds, action.from, action.to) }));

    case 'card/add': {
      if (!state.columns[action.columnId] || !action.title.trim()) return state;
      const card: Card = {
        id: action.id, title: action.title.trim(), description: '', labelIds: [], priority: 'medium',
        due: null, checklist: [], createdAt: action.createdAt,
      };
      const next = { ...state, cards: { ...state.cards, [card.id]: card } };
      return updateColumn(next, action.columnId, (c) => {
        const ids = c.cardIds.slice();
        ids.splice(action.index ?? ids.length, 0, card.id);
        return { ...c, cardIds: ids };
      });
    }
    case 'card/update':
      return updateCard(state, action.id, (c) => ({ ...c, ...action.patch }));
    case 'card/delete': {
      if (!state.cards[action.id]) return state;
      const col = columnOf(state, action.id);
      const next = col ? updateColumn(state, col.id, (c) => ({ ...c, cardIds: c.cardIds.filter((id) => id !== action.id) })) : state;
      return { ...next, cards: omit(next.cards, [action.id]) };
    }
    case 'card/move': {
      const from = columnOf(state, action.id);
      const to = state.columns[action.toColumnId];
      if (!from || !to) return state;
      if (from.id === to.id) {
        const fromIndex = from.cardIds.indexOf(action.id);
        if (fromIndex === action.toIndex) return state;
        return updateColumn(state, from.id, (c) => ({ ...c, cardIds: arrayMove(c.cardIds, fromIndex, action.toIndex) }));
      }
      const removed = updateColumn(state, from.id, (c) => ({ ...c, cardIds: c.cardIds.filter((id) => id !== action.id) }));
      return updateColumn(removed, to.id, (c) => {
        const ids = c.cardIds.slice();
        ids.splice(Math.max(0, Math.min(action.toIndex, ids.length)), 0, action.id);
        return { ...c, cardIds: ids };
      });
    }

    case 'checklist/add':
      if (!action.text.trim()) return state;
      return updateCard(state, action.cardId, (c) => ({
        ...c,
        checklist: [...c.checklist, { id: action.id, text: action.text.trim(), done: false }],
      }));
    case 'checklist/toggle':
      return updateCard(state, action.cardId, (c) => ({
        ...c,
        checklist: c.checklist.map((i) => (i.id === action.id ? { ...i, done: !i.done } : i)),
      }));
    case 'checklist/remove':
      return updateCard(state, action.cardId, (c) => ({ ...c, checklist: c.checklist.filter((i) => i.id !== action.id) }));

    case 'state/replace':
      return action.state;
  }
}
