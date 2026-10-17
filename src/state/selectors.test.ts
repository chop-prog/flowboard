import { describe, expect, it } from 'vitest';
import { boardStats, fuzzyScore, isOverdue, matchesFilters, todayISO, EMPTY_FILTERS } from './selectors';
import { createSeed } from './seed';
import { isValidState } from './persist';

const now = new Date('2026-03-10T12:00:00');
const today = todayISO(now);

describe('dates', () => {
  it('formats local dates', () => {
    expect(todayISO(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
  it('flags overdue cards unless done', () => {
    const card = { ...createSeed(now).cards['seed-1']!, due: '2026-03-09' };
    expect(isOverdue(card, today)).toBe(true);
    expect(isOverdue(card, today, true)).toBe(false);
    expect(isOverdue({ ...card, due: today }, today)).toBe(false);
  });
});

describe('filters', () => {
  const s = createSeed(now);
  const cards = Object.values(s.cards);
  it('matches title, description and label names case-insensitively', () => {
    expect(cards.filter((c) => matchesFilters(c, { ...EMPTY_FILTERS, query: 'RACE' }, s)).map((c) => c.title)).toEqual(['Investigate flaky checkout test']);
    expect(cards.some((c) => matchesFilters(c, { ...EMPTY_FILTERS, query: 'backend' }, s))).toBe(true);
  });
  it('requires all selected labels and the priority', () => {
    const both = cards.filter((c) => matchesFilters(c, { ...EMPTY_FILTERS, labelIds: ['l-bug', 'l-backend'] }, s));
    expect(both.map((c) => c.title)).toEqual(['Fix timezone bug in due dates']);
    const urgent = cards.filter((c) => matchesFilters(c, { ...EMPTY_FILTERS, priority: 'urgent' }, s));
    expect(urgent.every((c) => c.priority === 'urgent')).toBe(true);
  });
});

describe('boardStats', () => {
  it('counts done and overdue cards', () => {
    const s = createSeed(now);
    const st = boardStats(s, 'b-launch', today);
    expect(st.total).toBe(11);
    expect(st.done).toBe(3);
    expect(st.overdue).toBe(2);
    expect(st.progress).toBeCloseTo(3 / 11);
  });
});

describe('fuzzyScore', () => {
  it('rejects non-subsequences', () => {
    expect(fuzzyScore('xyz', 'New card')).toBe(-1);
  });
  it('prefers word starts and contiguous matches', () => {
    expect(fuzzyScore('nc', 'New card')).toBeGreaterThan(fuzzyScore('nc', 'Undo change'));
    expect(fuzzyScore('theme', 'Switch to dark theme')).toBeGreaterThan(fuzzyScore('theme', 'The meeting'));
  });
});

describe('isValidState', () => {
  it('accepts the seed and rejects broken references', () => {
    const s = createSeed(now);
    expect(isValidState(JSON.parse(JSON.stringify(s)))).toBe(true);
    expect(isValidState({ ...s, version: 2 })).toBe(false);
    expect(isValidState({ ...s, activeBoardId: 'ghost' })).toBe(false);
    const broken = structuredClone(s);
    broken.columns['c-done']!.cardIds.push('does-not-exist');
    expect(isValidState(broken)).toBe(false);
    expect(isValidState(null)).toBe(false);
    expect(isValidState('[]')).toBe(false);
  });
});
