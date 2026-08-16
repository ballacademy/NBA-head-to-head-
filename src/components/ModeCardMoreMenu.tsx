import { useEffect, useId, useRef, useState } from "react";

interface ModeCardMoreMenuProps {
  disabled?: boolean;
  onPractice: () => void;
  onPrivate: () => void;
}

/** Overflow control for secondary H2H actions (Practice / Private). */
export function ModeCardMoreMenu({
  disabled = false,
  onPractice,
  onPrivate,
}: ModeCardMoreMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  useEffect(() => {
    if (disabled) {
      setOpen(false);
    }
  }, [disabled]);

  return (
    <div className="mode-card-more" ref={rootRef}>
      <button
        type="button"
        className="mode-card-more__trigger"
        aria-label="More match options"
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="menu"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        More
      </button>
      {open ? (
        <div className="mode-card-more__menu" id={menuId} role="menu">
          <button
            type="button"
            className="mode-card-more__item"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onPractice();
            }}
          >
            Practice
          </button>
          <button
            type="button"
            className="mode-card-more__item"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onPrivate();
            }}
          >
            Private
          </button>
        </div>
      ) : null}
    </div>
  );
}
