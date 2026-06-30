import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface ModeCardInfoProps {
  details: string[];
  variant?: "inline" | "corner";
  popoverAlign?: "start" | "center" | "end";
  ariaLabel?: string;
}

const POPOVER_WIDTH = 280;
const POPOVER_MARGIN = 12;
const POPOVER_GAP = 8;

export function ModeCardInfo({
  details,
  variant = "inline",
  popoverAlign,
  ariaLabel = "Mode details",
}: ModeCardInfoProps) {
  const [open, setOpen] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const rootRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLSpanElement>(null);
  const popoverId = useId();
  const resolvedAlign =
    popoverAlign ?? (variant === "corner" ? "end" : "center");

  const updatePopoverPosition = () => {
    const button = buttonRef.current;

    if (!button) {
      return;
    }

    const rect = button.getBoundingClientRect();
    const width = Math.min(POPOVER_WIDTH, window.innerWidth - POPOVER_MARGIN * 2);
    let left = rect.left + rect.width / 2 - width / 2;

    if (resolvedAlign === "start") {
      left = rect.left;
    } else if (resolvedAlign === "end") {
      left = rect.right - width;
    }

    left = Math.max(
      POPOVER_MARGIN,
      Math.min(left, window.innerWidth - width - POPOVER_MARGIN),
    );

    setPopoverStyle({
      top: rect.bottom + POPOVER_GAP,
      left,
      width,
    });
  };

  useLayoutEffect(() => {
    if (!open) {
      setPopoverStyle(null);
      return;
    }

    updatePopoverPosition();

    const handleReposition = () => {
      updatePopoverPosition();
    };

    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [open, resolvedAlign]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      const clickedInsideRoot = rootRef.current?.contains(target);
      const clickedInsidePopover = popoverRef.current?.contains(target);

      if (!clickedInsideRoot && !clickedInsidePopover) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
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

  const popover =
    open && popoverStyle ? (
      <span
        className={`mode-card-info__popover mode-card-info__popover--fixed mode-card-info__popover--align-${resolvedAlign}`}
        id={popoverId}
        ref={popoverRef}
        role="tooltip"
        style={{
          top: popoverStyle.top,
          left: popoverStyle.left,
          width: popoverStyle.width,
        }}
      >
        <ul className="mode-card-info__list">
          {details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      </span>
    ) : null;

  return (
    <span
      className={`mode-card-info${
        variant === "corner" ? " mode-card-info--corner" : ""
      }`}
      ref={rootRef}
    >
      <button
        ref={buttonRef}
        type="button"
        className="mode-card-info__button"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={popoverId}
        onClick={() => setOpen((current) => !current)}
      >
        i
      </button>
      {popover ? createPortal(popover, document.body) : null}
    </span>
  );
}
