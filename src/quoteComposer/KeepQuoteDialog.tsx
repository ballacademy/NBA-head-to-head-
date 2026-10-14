import { useRef } from "react";
import { useDialogA11y } from "../hooks/useDialogA11y";

interface KeepQuoteDialogProps {
  playerName: string;
  quote: string;
  onKeep: () => void;
  onClear: () => void;
  onClose: () => void;
}

export function KeepQuoteDialog({
  playerName,
  quote,
  onKeep,
  onClear,
  onClose,
}: KeepQuoteDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogA11y({
    open: true,
    onClose,
    containerRef: dialogRef,
    lockScroll: true,
  });
  const preview = quote.replace(/\s+/g, " ").trim() || "this quote";

  return (
    <div
      className="sc-picker-scrim"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        className="sc-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="keep-quote-title"
      >
        <div className="sc-picker__top">
          <div>
            <h2 id="keep-quote-title">Keep this quote?</h2>
            <p>
              Keep “{preview}” for {playerName}, or clear it so they don’t
              inherit the last speaker’s line.
            </p>
          </div>
          <button type="button" className="sc-picker__close" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="sc-picker__footer">
          <button type="button" className="sc-btn sc-btn--ghost" onClick={onClear}>
            Clear quote
          </button>
          <button type="button" className="sc-btn sc-btn--primary" onClick={onKeep}>
            Keep quote
          </button>
        </div>
      </div>
    </div>
  );
}
