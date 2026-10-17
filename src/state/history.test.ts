import { describe, expect, it } from 'vitest';
import { createHistory, historyReducer } from './history';
import { createSeed } from './seed';

const add = (id: string) => ({ type: 'card/add' as const, columnId: 'c-backlog', id, title: id, createdAt: 0 });

describe('undo / redo', () => {
  it('undoes and redoes edits', () => {
    let h = createHistory(createSeed());
    h = historyReducer(h, add('a'));
    h = historyReducer(h, add('b'));
    expect(h.present.cards.b).toBeDefined();
    h = historyReducer(h, { type: 'history/undo' });
    expect(h.present.cards.b).toBeUndefined();
    expect(h.present.cards.a).toBeDefined();
    h = historyReducer(h, { type: 'history/redo' });
    expect(h.present.cards.b).toBeDefined();
  });

  it('a new edit clears the redo stack', () => {
    let h = createHistory(createSeed());
    h = historyReducer(h, add('a'));
    h = historyReducer(h, { type: 'history/undo' });
    h = historyReducer(h, add('c'));
    expect(h.future).toHaveLength(0);
    expect(historyReducer(h, { type: 'history/redo' })).toBe(h);
  });

  it('navigation is not recorded and no-ops are free', () => {
    const h0 = createHistory(createSeed());
    const h1 = historyReducer(h0, { type: 'board/select', id: 'b-personal' });
    expect(h1.past).toHaveLength(0);
    expect(h1.present.activeBoardId).toBe('b-personal');
    expect(historyReducer(h1, { type: 'card/delete', id: 'missing' })).toBe(h1);
  });

  it('keeps the current board when undoing', () => {
    let h = createHistory(createSeed());
    h = historyReducer(h, add('a'));
    h = historyReducer(h, { type: 'board/select', id: 'b-personal' });
    h = historyReducer(h, { type: 'history/undo' });
    expect(h.present.activeBoardId).toBe('b-personal');
  });

  it('caps history length', () => {
    let h = createHistory(createSeed());
    for (let i = 0; i < 150; i++) h = historyReducer(h, add(`k${i}`));
    expect(h.past.length).toBe(100);
  });
});
