import { useEffect, useId, useRef, useState } from "react";

interface ModeCardInfoProps {
  details: string[];
  variant?: "inline" | "corner";
}

export function ModeCardInfo({ details, variant = "inline" }: ModeCardInfoProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const popoverId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <span
      className={`mode-card-info${
        variant === "corner" ? " mode-card-info--corner" : ""
      }`}
      ref={rootRef}
    >
      <button
        type="button"
        className="mode-card-info__button"
        aria-label="Mode details"
        aria-expanded={open}
        aria-controls={popoverId}
        onClick={() => setOpen((current) => !current)}
      >
        i
      </button>
      {open ? (
        <span className="mode-card-info__popover" id={popoverId} role="tooltip">
          <ul className="mode-card-info__list">
            {details.map((detail) => (
              <li key={detail}>{detail}</li>
            ))}
          </ul>
        </span>
      ) : null}
    </span>
  );
}
