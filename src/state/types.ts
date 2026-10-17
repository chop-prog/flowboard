export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Card {
  id: string;
  title: string;
  description: string;
  labelIds: string[];
  priority: Priority;
  /** ISO date (yyyy-mm-dd) or null. */
  due: string | null;
  checklist: ChecklistItem[];
  createdAt: number;
}

export interface Column {
  id: string;
  title: string;
  cardIds: string[];
  /** Work-in-progress limit; null = unlimited. */
  wipLimit: number | null;
  /** Cards in a "done" column count as completed. */
  done: boolean;
}

export interface Board {
  id: string;
  name: string;
  emoji: string;
  columnIds: string[];
}

export interface State {
  version: 1;
  boards: Record<string, Board>;
  boardOrder: string[];
  columns: Record<string, Column>;
  cards: Record<string, Card>;
  labels: Record<string, Label>;
  activeBoardId: string;
}

export type CardPatch = Partial<Omit<Card, 'id' | 'createdAt' | 'checklist'>>;

export type Action =
  | { type: 'board/add'; id: string; name: string; emoji: string; columnIds: string[] }
  | { type: 'board/rename'; id: string; name: string }
  | { type: 'board/delete'; id: string }
  | { type: 'board/select'; id: string }
  | { type: 'column/add'; boardId: string; id: string; title: string }
  | { type: 'column/update'; id: string; patch: Partial<Pick<Column, 'title' | 'wipLimit' | 'done'>> }
  | { type: 'column/delete'; boardId: string; id: string }
  | { type: 'column/move'; boardId: string; from: number; to: number }
  | { type: 'card/add'; columnId: string; id: string; title: string; createdAt: number; index?: number }
  | { type: 'card/update'; id: string; patch: CardPatch }
  | { type: 'card/delete'; id: string }
  | { type: 'card/move'; id: string; toColumnId: string; toIndex: number }
  | { type: 'checklist/add'; cardId: string; id: string; text: string }
  | { type: 'checklist/toggle'; cardId: string; id: string }
  | { type: 'checklist/remove'; cardId: string; id: string }
  | { type: 'state/replace'; state: State };
