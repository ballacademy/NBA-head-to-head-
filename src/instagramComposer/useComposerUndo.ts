import { useRef, useState } from "react";

export function useComposerUndo<T>(limit = 24) {
  const stack = useRef<T[]>([]);
  const [canUndo, setCanUndo] = useState(false);

  const push = (snapshot: T) => {
    stack.current = [...stack.current, snapshot].slice(-limit);
    setCanUndo(true);
  };

  const pop = (): T | undefined => {
    const previous = stack.current.pop();
    setCanUndo(stack.current.length > 0);
    return previous;
  };

  return { push, pop, canUndo };
}
