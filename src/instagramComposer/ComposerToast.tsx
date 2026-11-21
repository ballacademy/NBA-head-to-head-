import { useEffect, useState } from "react";
import { COMPOSER_TOAST_EVENT } from "./composerFillToast";

export function ComposerToast() {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    let hide = 0;
    const onToast = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (!detail) {
        return;
      }
      setText(detail);
      window.clearTimeout(hide);
      hide = window.setTimeout(() => setText(null), 4200);
    };
    window.addEventListener(COMPOSER_TOAST_EVENT, onToast);
    return () => {
      window.clearTimeout(hide);
      window.removeEventListener(COMPOSER_TOAST_EVENT, onToast);
    };
  }, []);

  if (!text) {
    return null;
  }

  return (
    <p className="sc-toast" role="status">
      {text}
    </p>
  );
}
