import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useStore } from '../state/store';
import { boardColumns, PRIORITIES } from '../state/selectors';
import { uid } from '../state/persist';
import { Icon } from './Icon';

interface Props {
  cardId: string | null;
  onClose: () => void;
}

export function CardModal({ cardId, onClose }: Props) {
  const { state, dispatch } = useStore();
  const ref = useRef<HTMLDialogElement>(null);
  const card = cardId ? state.cards[cardId] : undefined;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [newItem, setNewItem] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Sync local drafts when a different card opens (or undo changes it underneath us).
  useEffect(() => {
    if (!card) return;
    setTitle(card.title);
    setDescription(card.description);
    setConfirmDelete(false);
  }, [card?.id, card?.title, card?.description]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (card && !d.open) d.showModal();
    if (!card && d.open) d.close();
  }, [card]);

  if (!card) return <dialog ref={ref} className="modal" onClose={onClose} />;

  const columns = boardColumns(state, state.activeBoardId);
  const columnId = columns.find((c) => c.cardIds.includes(card.id))?.id ?? '';
  const commitText = () => {
    const patch: { title?: string; description?: string } = {};
    if (title.trim() && title.trim() !== card.title) patch.title = title.trim();
    if (description !== card.description) patch.description = description;
    if (Object.keys(patch).length) dispatch({ type: 'card/update', id: card.id, patch });
  };
  const done = card.checklist.filter((i) => i.done).length;

  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby="card-title-input"
      onClose={() => {
        commitText();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
    >
      <div className="modal-body">
        <div className="modal-head">
          <input
            id="card-title-input"
            className="title-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitText}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            aria-label="Card title"
          />
          <button className="icon-btn" aria-label="Close" onClick={() => ref.current?.close()}>
            <Icon name="x" />
          </button>
        </div>

        <div className="fields">
          <label className="field">
            <span>Status</span>
            <select value={columnId} onChange={(e) => dispatch({ type: 'card/move', id: card.id, toColumnId: e.target.value, toIndex: 0 })}>
              {columns.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Due date</span>
            <input
              type="date"
              value={card.due ?? ''}
              onChange={(e) => dispatch({ type: 'card/update', id: card.id, patch: { due: e.target.value || null } })}
            />
          </label>
          <div className="field">
            <span id="prio-label">Priority</span>
            <div className="segmented" role="radiogroup" aria-labelledby="prio-label">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  role="radio"
                  aria-checked={card.priority === p}
                  className={`prio-${p}`}
                  onClick={() => dispatch({ type: 'card/update', id: card.id, patch: { priority: p } })}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="field">
          <span>Labels</span>
          <div className="label-picker">
            {Object.values(state.labels).map((l) => {
              const on = card.labelIds.includes(l.id);
              return (
                <button
                  key={l.id}
                  className={`pill toggle ${on ? 'on' : ''}`}
                  style={{ '--c': l.color } as CSSProperties}
                  aria-pressed={on}
                  onClick={() =>
                    dispatch({
                      type: 'card/update',
                      id: card.id,
                      patch: { labelIds: on ? card.labelIds.filter((x) => x !== l.id) : [...card.labelIds, l.id] },
                    })
                  }
                >
                  {l.name}
                </button>
              );
            })}
          </div>
        </div>

        <label className="field">
          <span>Description</span>
          <textarea
            rows={4}
            value={description}
            placeholder="Add more detail…"
            onChange={(e) => setDescription(e.target.value)}
            onBlur={commitText}
          />
        </label>

        <div className="field">
          <span>
            Checklist {card.checklist.length > 0 && <em className="muted">{done}/{card.checklist.length}</em>}
          </span>
          {card.checklist.length > 0 && (
            <div className="progress" aria-hidden="true"><i style={{ width: `${(done / card.checklist.length) * 100}%` }} /></div>
          )}
          <ul className="checklist">
            {card.checklist.map((item) => (
              <li key={item.id}>
                <label>
                  <input type="checkbox" checked={item.done} onChange={() => dispatch({ type: 'checklist/toggle', cardId: card.id, id: item.id })} />
                  <span className={item.done ? 'struck' : ''}>{item.text}</span>
                </label>
                <button className="icon-btn small" aria-label={`Remove ${item.text}`} onClick={() => dispatch({ type: 'checklist/remove', cardId: card.id, id: item.id })}>
                  <Icon name="x" size={14} />
                </button>
              </li>
            ))}
          </ul>
          <form
            className="inline-add"
            onSubmit={(e) => {
              e.preventDefault();
              dispatch({ type: 'checklist/add', cardId: card.id, id: uid(), text: newItem });
              setNewItem('');
            }}
          >
            <input value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="Add an item and press Enter" aria-label="New checklist item" />
          </form>
        </div>

        <div className="modal-foot">
          <span className="muted">Created {new Date(card.createdAt).toLocaleDateString()}</span>
          <button
            className={`btn ${confirmDelete ? 'danger' : 'ghost'}`}
            onClick={() => {
              if (!confirmDelete) return setConfirmDelete(true);
              dispatch({ type: 'card/delete', id: card.id });
              onClose();
            }}
          >
            <Icon name="trash" /> {confirmDelete ? 'Click again to delete' : 'Delete'}
          </button>
        </div>
      </div>
    </dialog>
  );
}
