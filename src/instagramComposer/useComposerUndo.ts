import { useRef, useState } from "react";

export function useComposerUndo<T>(limit = 24) {
  const past = useRef<T[]>([]);
  const future = useRef<T[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const sync = () => {
    setCanUndo(past.current.length > 0);
    setCanRedo(future.current.length > 0);
  };

  const push = (snapshot: T) => {
    past.current = [...past.current, snapshot].slice(-limit);
    future.current = [];
    sync();
  };

  const undo = (current: T): T | undefined => {
    const previous = past.current.pop();
    if (!previous) {
      sync();
      return undefined;
    }
    future.current = [...future.current, current].slice(-limit);
    sync();
    return previous;
  };

  const redo = (current: T): T | undefined => {
    const next = future.current.pop();
    if (!next) {
      sync();
      return undefined;
    }
    past.current = [...past.current, current].slice(-limit);
    sync();
    return next;
  };

  return { push, undo, redo, canUndo, canRedo };
}
