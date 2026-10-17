import { useState, type FormEvent } from 'react';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Card, Column as ColumnT, Label } from '../state/types';
import { useStore } from '../state/store';
import { uid } from '../state/persist';
import { CardItem } from './CardItem';
import { Icon } from './Icon';

interface Props {
  boardId: string;
  column: ColumnT;
  cardIds: string[];
  cards: Record<string, Card>;
  labels: Record<string, Label>;
  visible: (card: Card) => boolean;
  today: string;
  dragDisabled: boolean;
  onOpenCard: (id: string) => void;
}

export function Column({ boardId, column, cardIds, cards, labels, visible, today, dragDisabled, onOpenCard }: Props) {
  const { dispatch } = useStore();
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: `col-${column.id}`,
    data: { type: 'column', columnId: column.id },
    disabled: dragDisabled,
  });

  const shown = cardIds.filter((id) => cards[id] && visible(cards[id]!));
  const over = column.wipLimit !== null && cardIds.length > column.wipLimit;

  const addCard = (e: FormEvent | { preventDefault: () => void }) => {
    e.preventDefault();
    if (!draft.trim()) return;
    dispatch({ type: 'card/add', columnId: column.id, id: uid(), title: draft, createdAt: Date.now() });
    setDraft('');
  };

  return (
    <section
      ref={setNodeRef}
      className={`column ${isDragging ? 'is-placeholder' : ''} ${over ? 'over-limit' : ''}`}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      aria-label={`${column.title}, ${cardIds.length} cards`}
    >
      <header className="column-header">
        <span className="grip" {...attributes} {...listeners} aria-label={`Reorder column ${column.title}`}>
          <Icon name="grip" size={14} />
        </span>
        {editingTitle ? (
          <input
            className="column-title-input"
            defaultValue={column.title}
            autoFocus
            aria-label="Column title"
            onBlur={(e) => {
              dispatch({ type: 'column/update', id: column.id, patch: { title: e.target.value.trim() || column.title } });
              setEditingTitle(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
              if (e.key === 'Escape') setEditingTitle(false);
            }}
          />
        ) : (
          <h2 className="column-title" onDoubleClick={() => setEditingTitle(true)} title="Double-click to rename">
            {column.done && <span className="done-dot" aria-label="Done column" />}
            {column.title}
          </h2>
        )}
        <span className={`count ${over ? 'warn' : ''}`} title={column.wipLimit ? `WIP limit ${column.wipLimit}` : undefined}>
          {cardIds.length}
          {column.wipLimit !== null && `/${column.wipLimit}`}
        </span>
        <div className="menu-wrap">
          <button className="icon-btn" aria-label={`${column.title} options`} aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)}>
            <Icon name="dots" />
          </button>
          {menuOpen && (
            <div className="menu" role="menu" onMouseLeave={() => setMenuOpen(false)}>
              <button role="menuitem" onClick={() => { setEditingTitle(true); setMenuOpen(false); }}>Rename</button>
              <button role="menuitem" onClick={() => { dispatch({ type: 'column/update', id: column.id, patch: { done: !column.done } }); setMenuOpen(false); }}>
                {column.done ? 'Unmark as done column' : 'Mark as done column'}
              </button>
              <button
                role="menuitem"
                onClick={() => {
                  const raw = window.prompt('WIP limit (empty for none)', column.wipLimit?.toString() ?? '');
                  if (raw !== null) {
                    const n = Number.parseInt(raw, 10);
                    dispatch({ type: 'column/update', id: column.id, patch: { wipLimit: Number.isFinite(n) && n > 0 ? n : null } });
                  }
                  setMenuOpen(false);
                }}
              >
                Set WIP limit…
              </button>
              <button role="menuitem" className="danger" onClick={() => { dispatch({ type: 'column/delete', boardId, id: column.id }); setMenuOpen(false); }}>
                Delete column
              </button>
            </div>
          )}
        </div>
      </header>

      <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
        <ul className="card-list">
          {shown.map((id) => (
            <CardItem
              key={id}
              card={cards[id]!}
              labels={labels}
              columnId={column.id}
              done={column.done}
              today={today}
              disabled={dragDisabled}
              onOpen={onOpenCard}
            />
          ))}
          {shown.length === 0 && <li className="empty">{cardIds.length ? 'No matches' : 'Drop cards here'}</li>}
        </ul>
      </SortableContext>

      {composing ? (
        <form className="composer" onSubmit={addCard}>
          <textarea
            autoFocus
            value={draft}
            placeholder="What needs doing?"
            aria-label={`New card title in ${column.title}`}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) addCard(e);
              if (e.key === 'Escape') { setComposing(false); setDraft(''); }
            }}
          />
          <div className="composer-actions">
            <button type="submit" className="btn primary">Add card</button>
            <button type="button" className="btn ghost" onClick={() => { setComposing(false); setDraft(''); }}>Cancel</button>
          </div>
        </form>
      ) : (
        <button className="add-card" onClick={() => setComposing(true)}>
          <Icon name="plus" /> Add card
        </button>
      )}
    </section>
  );
}
