import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface ModeCardInfoProps {
  details: string[];
  variant?: "inline" | "corner";
  popoverAlign?: "start" | "center" | "end";
  ariaLabel?: string;
  popoverClassName?: string;
}

const POPOVER_WIDTH = 280;
const POPOVER_MARGIN = 12;
const POPOVER_GAP = 8;
const DISMISS_CLICK_GUARD_MS = 400;

export function ModeCardInfo({
  details,
  variant = "inline",
  popoverAlign,
  ariaLabel = "Mode details",
  popoverClassName = "",
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
  const suppressClickRef = useRef(false);
  const popoverId = useId();
  const resolvedAlign =
    popoverAlign ?? (variant === "corner" ? "end" : "center");

  const closePopover = () => {
    setOpen(false);
    suppressClickRef.current = true;
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, DISMISS_CLICK_GUARD_MS);
  };

  const updatePopoverPosition = () => {
    const button = buttonRef.current;

    if (!button) {
      return;
    }

    const rect = button.getBoundingClientRect();
    const viewportWidth =
      window.visualViewport?.width ?? document.documentElement.clientWidth;
    const viewportHeight =
      window.visualViewport?.height ?? document.documentElement.clientHeight;
    const viewportOffsetLeft = window.visualViewport?.offsetLeft ?? 0;
    const viewportOffsetTop = window.visualViewport?.offsetTop ?? 0;
    const width = Math.min(
      POPOVER_WIDTH,
      viewportWidth - POPOVER_MARGIN * 2,
    );
    let left = rect.left + rect.width / 2 - width / 2;

    if (resolvedAlign === "start") {
      left = rect.left;
    } else if (resolvedAlign === "end") {
      left = rect.right - width;
    }

    const minLeft = viewportOffsetLeft + POPOVER_MARGIN;
    const maxLeft = viewportOffsetLeft + viewportWidth - width - POPOVER_MARGIN;
    left = Math.max(minLeft, Math.min(left, maxLeft));

    let top = rect.bottom + POPOVER_GAP;
    const estimatedHeight = 160;
    const maxTop =
      viewportOffsetTop + viewportHeight - estimatedHeight - POPOVER_MARGIN;

    if (top > maxTop) {
      top = Math.max(
        viewportOffsetTop + POPOVER_MARGIN,
        rect.top - estimatedHeight - POPOVER_GAP,
      );
    }

    setPopoverStyle({
      top,
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
        closePopover();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        closePopover();
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
        className={`mode-card-info__popover mode-card-info__popover--fixed mode-card-info__popover--align-${resolvedAlign}${popoverClassName ? ` ${popoverClassName}` : ""}`}
        id={popoverId}
        ref={popoverRef}
        role="tooltip"
        style={{
          top: popoverStyle.top,
          left: popoverStyle.left,
          width: popoverStyle.width,
          transform: "none",
          maxWidth: `min(${POPOVER_WIDTH}px, calc(100vw - ${POPOVER_MARGIN * 2}px))`,
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
        onClick={() => {
          if (suppressClickRef.current) {
            return;
          }

          setOpen((current) => !current);
        }}
      >
        i
      </button>
      {popover ? createPortal(popover, document.body) : null}
    </span>
  );
}
