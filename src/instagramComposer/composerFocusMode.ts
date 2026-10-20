import { useEffect, useState } from "react";

export const COMPOSER_FOCUS_EVENT = "ddgm:composer-focus";

export const useComposerFocusMode = () => {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const sync = (event: Event) => {
      const detail = (event as CustomEvent<boolean>).detail;
      if (typeof detail === "boolean") {
        setOn(detail);
      }
    };
    window.addEventListener(COMPOSER_FOCUS_EVENT, sync);
    return () => window.removeEventListener(COMPOSER_FOCUS_EVENT, sync);
  }, []);

  const write = (next: boolean) => {
    setOn(next);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(COMPOSER_FOCUS_EVENT, { detail: next }));
    }
  };

  return [on, write] as const;
};
