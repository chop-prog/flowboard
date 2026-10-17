import type { Card, Column, Label, Priority, State } from './types';

const LABELS: Label[] = [
  { id: 'l-design', name: 'Design', color: '#a855f7' },
  { id: 'l-frontend', name: 'Frontend', color: '#3b82f6' },
  { id: 'l-backend', name: 'Backend', color: '#10b981' },
  { id: 'l-bug', name: 'Bug', color: '#ef4444' },
  { id: 'l-research', name: 'Research', color: '#f59e0b' },
  { id: 'l-personal', name: 'Personal', color: '#ec4899' },
];

/** Date offset from today as yyyy-mm-dd, so the demo always has upcoming and overdue work. */
function day(offset: number, now: Date): string {
  const d = new Date(now);
  d.setDate(d.getDate() + offset);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${dd}`;
}

type CardSpec = [title: string, labels: string[], priority: Priority, due: number | null, checklist?: [string, boolean][], description?: string];

export function createSeed(now = new Date()): State {
  const cards: Record<string, Card> = {};
  const columns: Record<string, Column> = {};
  let n = 0;
  const makeColumn = (id: string, title: string, specs: CardSpec[], extra: Partial<Column> = {}): string => {
    const cardIds = specs.map(([title, labelIds, priority, due, checklist = [], description = '']) => {
      const id = `seed-${++n}`;
      cards[id] = {
        id, title, labelIds, priority, description,
        due: due === null ? null : day(due, now),
        checklist: checklist.map(([text, done], i) => ({ id: `${id}-c${i}`, text, done })),
        createdAt: now.getTime() - n * 3_600_000,
      };
      return id;
    });
    columns[id] = { id, title, cardIds, wipLimit: null, done: false, ...extra };
    return id;
  };

  const launch = [
    makeColumn('c-backlog', 'Backlog', [
      ['Dark mode for the marketing site', ['l-design', 'l-frontend'], 'low', 12],
      ['Investigate flaky checkout test', ['l-bug'], 'medium', 4, [], 'Fails ~1 in 20 runs on CI. Suspect a race between the payment mock and the router.'],
      ['Interview 5 users about onboarding', ['l-research'], 'medium', 9, [['Write script', true], ['Recruit participants', false], ['Synthesize notes', false]]],
    ]),
    makeColumn('c-progress', 'In progress', [
      ['Command palette (⌘K)', ['l-frontend'], 'high', 2, [['Fuzzy search', true], ['Keyboard navigation', true], ['Recent commands', false]],
        'Every action in the app should be reachable without a mouse.'],
      ['Rate-limit the public API', ['l-backend'], 'urgent', -1, [['Token bucket per key', true], ['429 responses', false]]],
      ['Pricing page illustrations', ['l-design'], 'medium', 5],
    ], { wipLimit: 3 }),
    makeColumn('c-review', 'Review', [
      ['Drag & drop between columns', ['l-frontend'], 'high', 1, [['Pointer', true], ['Touch', true], ['Keyboard', true]]],
      ['Fix timezone bug in due dates', ['l-bug', 'l-backend'], 'high', -2],
    ]),
    makeColumn('c-done', 'Done', [
      ['Set up CI with type-checking', ['l-backend'], 'medium', null],
      ['Design system: colour tokens', ['l-design'], 'low', null],
      ['Undo / redo for every action', ['l-frontend'], 'high', null],
    ], { done: true }),
  ];

  const personal = [
    makeColumn('p-todo', 'To do', [
      ['Book dentist appointment', ['l-personal'], 'medium', 3],
      ['Read “Designing Data-Intensive Applications”', ['l-research'], 'low', null, [['Part I', true], ['Part II', false], ['Part III', false]]],
    ]),
    makeColumn('p-doing', 'Doing', [['Morning runs: 5 km', ['l-personal'], 'medium', 0]]),
    makeColumn('p-done', 'Done', [['Renew passport', ['l-personal'], 'high', null]], { done: true }),
  ];

  return {
    version: 1,
    boards: {
      'b-launch': { id: 'b-launch', name: 'Product launch', emoji: '🚀', columnIds: launch },
      'b-personal': { id: 'b-personal', name: 'Personal', emoji: '🌿', columnIds: personal },
    },
    boardOrder: ['b-launch', 'b-personal'],
    columns,
    cards,
    labels: Object.fromEntries(LABELS.map((l) => [l.id, l])),
    activeBoardId: 'b-launch',
  };
}
