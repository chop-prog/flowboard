import { useEffect, useMemo, useRef, useState } from 'react';
import { fuzzyScore } from '../state/selectors';
import { Icon, type IconName } from './Icon';

export interface Command {
  id: string;
  title: string;
  section: string;
  icon?: IconName;
  shortcut?: string;
  run: () => void;
}

interface Props {
  open: boolean;
  commands: Command[];
  onClose: () => void;
}

/** ⌘K palette: fuzzy-ranked commands, fully keyboard driven, ARIA combobox pattern. */
export function CommandPalette({ open, commands, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const ref = useRef<HTMLDialogElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setQuery('');
      setIndex(0);
      d.showModal();
    }
    if (!open && d.open) d.close();
  }, [open]);

  const results = useMemo(() => {
    if (!query.trim()) return commands.filter((c) => c.section !== 'Cards').slice(0, 14);
    return commands
      .map((c) => ({ c, s: fuzzyScore(query, `${c.title} ${c.section}`) }))
      .filter((x) => x.s >= 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 14)
      .map((x) => x.c);
  }, [commands, query]);

  useEffect(() => setIndex(0), [query]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-i="${index}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [index]);

  const run = (c: Command | undefined) => {
    if (!c) return;
    onClose();
    // Let the dialog close before the command opens anything else.
    requestAnimationFrame(() => c.run());
  };

  return (
    <dialog ref={ref} className="palette" onClose={onClose} onClick={(e) => e.target === e.currentTarget && onClose()} aria-label="Command palette">
      <div className="palette-input">
        <Icon name="search" />
        <input
          autoFocus
          role="combobox"
          aria-label="Search commands"
          aria-expanded="true"
          aria-controls="palette-list"
          aria-activedescendant={results[index] ? `cmd-${results[index]!.id}` : undefined}
          placeholder="Type a command or search cards…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setIndex((i) => Math.min(results.length - 1, i + 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setIndex((i) => Math.max(0, i - 1)); }
            if (e.key === 'Enter') { e.preventDefault(); run(results[index]); }
          }}
        />
        <kbd>Esc</kbd>
      </div>
      <ul id="palette-list" role="listbox" ref={listRef} className="palette-list">
        {results.map((c, i) => (
          <li
            key={c.id}
            id={`cmd-${c.id}`}
            data-i={i}
            role="option"
            aria-selected={i === index}
            className={i === index ? 'active' : ''}
            onMouseMove={() => setIndex(i)}
            onClick={() => run(c)}
          >
            <span className="cmd-icon">{c.icon && <Icon name={c.icon} />}</span>
            <span className="cmd-title">{c.title}</span>
            <span className="cmd-section">{c.section}</span>
            {c.shortcut && <kbd>{c.shortcut}</kbd>}
          </li>
        ))}
        {results.length === 0 && <li className="palette-empty">No results for “{query}”</li>}
      </ul>
    </dialog>
  );
}
