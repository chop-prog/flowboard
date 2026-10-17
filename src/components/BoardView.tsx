import { useCallback, useMemo, useRef, useState } from 'react';
import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCenter, closestCorners, useSensor, useSensors,
  type CollisionDetection, type DragEndEvent, type DragOverEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useStore } from '../state/store';
import { boardColumns, isFiltering, matchesFilters, type Filters } from '../state/selectors';
import { arrayMove } from '../state/reducer';
import { uid } from '../state/persist';
import type { Card } from '../state/types';
import { Column } from './Column';
import { CardFace } from './CardItem';
import { Icon } from './Icon';

type Layout = Record<string, string[]>;

interface Props {
  filters: Filters;
  today: string;
  onOpenCard: (id: string) => void;
}

/**
 * Drag & drop strategy: while a card is dragged we work on a local *preview* layout so
 * cards visibly make room across columns, then commit a single `card/move` on drop.
 * That keeps the undo history to one entry per drag.
 */
export function BoardView({ filters, today, onOpenCard }: Props) {
  const { state, dispatch } = useStore();
  const boardId = state.activeBoardId;
  const columns = boardColumns(state, boardId);
  const [preview, setPreview] = useState<Layout | null>(null);
  const previewRef = useRef<Layout | null>(null);
  const [active, setActive] = useState<{ type: 'card' | 'column'; id: string } | null>(null);
  const filtering = isFiltering(filters);

  const setLayout = (l: Layout | null) => {
    previewRef.current = l;
    setPreview(l);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Columns only collide with columns; cards collide with everything.
  const collision: CollisionDetection = useCallback((args) => {
    if (args.active.data.current?.type === 'column') {
      return closestCenter({ ...args, droppableContainers: args.droppableContainers.filter((c) => c.data.current?.type === 'column') });
    }
    return closestCorners(args);
  }, []);

  const visible = useCallback((card: Card) => matchesFilters(card, filters, state), [filters, state]);
  const colOf = (layout: Layout, cardId: string) => Object.keys(layout).find((k) => layout[k]!.includes(cardId));

  const onDragStart = ({ active: a }: DragStartEvent) => {
    const type = a.data.current?.type as 'card' | 'column';
    setActive({ type, id: String(a.id) });
    if (type === 'card') setLayout(Object.fromEntries(columns.map((c) => [c.id, c.cardIds])));
  };

  const onDragOver = ({ active: a, over }: DragOverEvent) => {
    const layout = previewRef.current;
    if (!layout || !over || a.data.current?.type !== 'card') return;
    const id = String(a.id);
    const from = colOf(layout, id);
    const overType = over.data.current?.type;
    const to = overType === 'column' ? (over.data.current?.columnId as string) : colOf(layout, String(over.id));
    if (!from || !to || from === to) return;
    const target = layout[to]!;
    let index = target.length;
    if (overType === 'card') {
      const overIndex = target.indexOf(String(over.id));
      const dragged = a.rect.current.translated;
      const below = dragged ? dragged.top > over.rect.top + over.rect.height / 2 : false;
      index = overIndex + (below ? 1 : 0);
    }
    setLayout({
      ...layout,
      [from]: layout[from]!.filter((x) => x !== id),
      [to]: [...target.slice(0, index), id, ...target.slice(index)],
    });
  };

  const onDragEnd = ({ active: a, over }: DragEndEvent) => {
    const type = a.data.current?.type;
    if (type === 'column' && over) {
      const ids = columns.map((c) => `col-${c.id}`);
      const from = ids.indexOf(String(a.id));
      const overCol = over.data.current?.columnId as string | undefined;
      const to = overCol ? ids.indexOf(`col-${overCol}`) : -1;
      if (from !== -1 && to !== -1 && from !== to) dispatch({ type: 'column/move', boardId, from, to });
    }
    if (type === 'card') {
      const layout = previewRef.current;
      const id = String(a.id);
      const col = layout && colOf(layout, id);
      if (layout && col) {
        let list = layout[col]!;
        if (over && over.data.current?.type === 'card' && over.id !== a.id && list.includes(String(over.id))) {
          list = arrayMove(list, list.indexOf(id), list.indexOf(String(over.id)));
        }
        dispatch({ type: 'card/move', id, toColumnId: col, toIndex: list.indexOf(id) });
      }
    }
    setLayout(null);
    setActive(null);
  };

  const onDragCancel = () => {
    setLayout(null);
    setActive(null);
  };

  const columnIds = useMemo(() => columns.map((c) => `col-${c.id}`), [columns]);
  const activeCard = active?.type === 'card' ? state.cards[active.id] : undefined;
  const activeColumn = active?.type === 'column' ? state.columns[active.id.slice(4)] : undefined;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <div className="board" role="region" aria-label="Board columns">
        <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
          {columns.map((col) => (
            <Column
              key={col.id}
              boardId={boardId}
              column={col}
              cardIds={preview?.[col.id] ?? col.cardIds}
              cards={state.cards}
              labels={state.labels}
              visible={visible}
              today={today}
              dragDisabled={filtering}
              onOpenCard={onOpenCard}
            />
          ))}
        </SortableContext>
        <button
          className="add-column"
          onClick={() => {
            const title = window.prompt('Column name');
            if (title?.trim()) dispatch({ type: 'column/add', boardId, id: uid(), title: title.trim() });
          }}
        >
          <Icon name="plus" /> Add column
        </button>
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }}>
        {activeCard ? (
          <div className="card is-overlay">
            <div className="card-button">
              <CardFace card={activeCard} labels={state.labels} done={false} today={today} />
            </div>
          </div>
        ) : activeColumn ? (
          <div className="column is-overlay">
            <header className="column-header"><h2 className="column-title">{activeColumn.title}</h2></header>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
