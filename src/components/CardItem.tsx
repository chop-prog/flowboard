import { memo, type CSSProperties } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Card, Label } from '../state/types';
import { isOverdue } from '../state/selectors';
import { Icon } from './Icon';

interface Props {
  card: Card;
  labels: Record<string, Label>;
  columnId: string;
  done: boolean;
  today: string;
  disabled: boolean;
  onOpen: (id: string) => void;
}

const fmtDue = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export function CardFace({ card, labels, done, today }: Pick<Props, 'card' | 'labels' | 'done' | 'today'>) {
  const checked = card.checklist.filter((i) => i.done).length;
  const overdue = isOverdue(card, today, done);
  return (
    <>
      {card.labelIds.length > 0 && (
        <div className="card-labels">
          {card.labelIds.map((id) => {
            const l = labels[id];
            return l ? <span key={id} className="pill" style={{ '--c': l.color } as CSSProperties}>{l.name}</span> : null;
          })}
        </div>
      )}
      <div className="card-title">{card.title}</div>
      <div className="card-meta">
        <span className={`prio prio-${card.priority}`} title={`Priority: ${card.priority}`}>
          <Icon name="flag" size={13} />
          {card.priority}
        </span>
        {card.due && (
          <span className={`meta ${overdue ? 'overdue' : ''} ${card.due === today && !done ? 'today' : ''}`}>
            <Icon name="calendar" size={13} />
            {card.due === today ? 'Today' : fmtDue(card.due)}
          </span>
        )}
        {card.checklist.length > 0 && (
          <span className={`meta ${checked === card.checklist.length ? 'complete' : ''}`}>
            <Icon name="checklist" size={13} />
            {checked}/{card.checklist.length}
          </span>
        )}
        {card.description && (
          <span className="meta" title="Has description">
            <Icon name="text" size={13} />
          </span>
        )}
      </div>
    </>
  );
}

export const CardItem = memo(function CardItem({ card, labels, columnId, done, today, disabled, onOpen }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'card', columnId },
    disabled,
  });
  return (
    <li
      ref={setNodeRef}
      className={`card ${isDragging ? 'is-placeholder' : ''} ${done ? 'is-done' : ''}`}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      <button
        type="button"
        className="card-button"
        onClick={() => onOpen(card.id)}
        aria-label={`${card.title}. Priority ${card.priority}${card.due ? `, due ${card.due}` : ''}. Press space to pick up, enter to open.`}
        {...attributes}
        {...listeners}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onOpen(card.id);
          else listeners?.onKeyDown?.(e);
        }}
      >
        <CardFace card={card} labels={labels} done={done} today={today} />
      </button>
    </li>
  );
});
