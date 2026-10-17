import { describe, expect, it } from 'vitest';
import { arrayMove, reducer } from './reducer';
import { createSeed } from './seed';
import type { State } from './types';

const seed = () => createSeed(new Date('2026-03-10T12:00:00'));
const cardsIn = (s: State, col: string) => s.columns[col]!.cardIds;

describe('arrayMove', () => {
  it('moves forward and backward without mutating', () => {
    const a = ['a', 'b', 'c', 'd'];
    expect(arrayMove(a, 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(arrayMove(a, 3, 0)).toEqual(['d', 'a', 'b', 'c']);
    expect(a).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('cards', () => {
  it('adds a trimmed card at the requested index', () => {
    const s = reducer(seed(), { type: 'card/add', columnId: 'c-backlog', id: 'x', title: '  Hello  ', createdAt: 1, index: 1 });
    expect(s.cards.x!.title).toBe('Hello');
    expect(cardsIn(s, 'c-backlog')[1]).toBe('x');
  });

  it('ignores empty titles and unknown columns (returns the same object)', () => {
    const s0 = seed();
    expect(reducer(s0, { type: 'card/add', columnId: 'c-backlog', id: 'x', title: '   ', createdAt: 1 })).toBe(s0);
    expect(reducer(s0, { type: 'card/add', columnId: 'nope', id: 'x', title: 'A', createdAt: 1 })).toBe(s0);
  });

  it('moves a card across columns', () => {
    const s0 = seed();
    const id = cardsIn(s0, 'c-backlog')[0]!;
    const s = reducer(s0, { type: 'card/move', id, toColumnId: 'c-done', toIndex: 1 });
    expect(cardsIn(s, 'c-backlog')).not.toContain(id);
    expect(cardsIn(s, 'c-done')[1]).toBe(id);
    // Other columns are structurally shared.
    expect(s.columns['c-review']).toBe(s0.columns['c-review']);
  });

  it('reorders within a column', () => {
    const s0 = seed();
    const [a, b, c] = cardsIn(s0, 'c-backlog');
    const s = reducer(s0, { type: 'card/move', id: a!, toColumnId: 'c-backlog', toIndex: 2 });
    expect(cardsIn(s, 'c-backlog')).toEqual([b, c, a]);
  });

  it('deletes a card and removes it from its column', () => {
    const s0 = seed();
    const id = cardsIn(s0, 'c-review')[0]!;
    const s = reducer(s0, { type: 'card/delete', id });
    expect(s.cards[id]).toBeUndefined();
    expect(cardsIn(s, 'c-review')).not.toContain(id);
  });

  it('manages checklist items', () => {
    let s = reducer(seed(), { type: 'card/add', columnId: 'c-backlog', id: 'x', title: 'A', createdAt: 1 });
    s = reducer(s, { type: 'checklist/add', cardId: 'x', id: 'i1', text: 'step' });
    s = reducer(s, { type: 'checklist/toggle', cardId: 'x', id: 'i1' });
    expect(s.cards.x!.checklist).toEqual([{ id: 'i1', text: 'step', done: true }]);
    s = reducer(s, { type: 'checklist/remove', cardId: 'x', id: 'i1' });
    expect(s.cards.x!.checklist).toEqual([]);
  });
});

describe('columns & boards', () => {
  it('deleting a column also deletes its cards', () => {
    const s0 = seed();
    const ids = cardsIn(s0, 'c-progress');
    const s = reducer(s0, { type: 'column/delete', boardId: 'b-launch', id: 'c-progress' });
    expect(s.columns['c-progress']).toBeUndefined();
    expect(s.boards['b-launch']!.columnIds).not.toContain('c-progress');
    for (const id of ids) expect(s.cards[id]).toBeUndefined();
  });

  it('reorders columns', () => {
    const s = reducer(seed(), { type: 'column/move', boardId: 'b-launch', from: 3, to: 0 });
    expect(s.boards['b-launch']!.columnIds[0]).toBe('c-done');
  });

  it('adds a board with default columns and selects it', () => {
    const s = reducer(seed(), { type: 'board/add', id: 'b2', name: 'New', emoji: '✨', columnIds: ['x1', 'x2', 'x3'] });
    expect(s.activeBoardId).toBe('b2');
    expect(s.columns.x3!.done).toBe(true);
    expect(s.boardOrder.at(-1)).toBe('b2');
  });

  it('deleting a board cascades and never deletes the last board', () => {
    let s = reducer(seed(), { type: 'board/delete', id: 'b-personal' });
    expect(s.boards['b-personal']).toBeUndefined();
    expect(Object.keys(s.cards).every((id) => Object.values(s.columns).some((c) => c.cardIds.includes(id)))).toBe(true);
    const last = s;
    s = reducer(s, { type: 'board/delete', id: 'b-launch' });
    expect(s).toBe(last);
  });
});
