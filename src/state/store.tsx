import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import { createHistory, historyReducer, type HistoryAction } from './history';
import { loadState, saveState } from './persist';
import { createSeed } from './seed';
import type { State } from './types';

interface Store {
  state: State;
  dispatch: (action: HistoryAction) => void;
  canUndo: boolean;
  canRedo: boolean;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children, initial }: { children: ReactNode; initial?: State }) {
  const [history, dispatch] = useReducer(historyReducer, undefined, () =>
    createHistory(initial ?? loadState() ?? createSeed()),
  );

  // Debounced autosave — typing in a field doesn't hammer localStorage.
  useEffect(() => {
    const t = setTimeout(() => saveState(history.present), 250);
    return () => clearTimeout(t);
  }, [history.present]);

  const value = useMemo<Store>(
    () => ({ state: history.present, dispatch, canUndo: history.past.length > 0, canRedo: history.future.length > 0 }),
    [history],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside <StoreProvider>');
  return store;
}
