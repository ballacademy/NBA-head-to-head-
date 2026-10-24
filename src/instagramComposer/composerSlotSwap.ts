import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

export const COMPOSER_SLOT_ATTR = "data-composer-slot";
export const COMPOSER_SLOT_SWAP_THRESHOLD = 8;

export const swapItems = <T>(items: readonly T[], from: number, to: number): T[] => {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= items.length ||
    to >= items.length
  ) {
    return items.slice();
  }
  const next = items.slice();
  const held = next[from]!;
  next[from] = next[to]!;
  next[to] = held;
  return next;
};

export const insertItems = <T>(items: readonly T[], from: number, to: number): T[] => {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= items.length ||
    to >= items.length
  ) {
    return items.slice();
  }
  const next = items.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved!);
  return next;
};

export const composerSlotFromPoint = (x: number, y: number): number | null => {
  const node = document.elementFromPoint(x, y);
  if (!(node instanceof Element)) {
    return null;
  }
  const slot = node.closest(`[${COMPOSER_SLOT_ATTR}]`);
  const raw = slot?.getAttribute(COMPOSER_SLOT_ATTR);
  const index = Number.parseInt(raw ?? "", 10);
  return Number.isInteger(index) ? index : null;
};

export const isComposerSlotSwapIgnored = (target: EventTarget | null) => {
  if (!(target instanceof Element)) {
    return false;
  }
  const ignored = target.closest(
    "input, textarea, button, label, .pod-photo__tool, .pod-photo__file, .pod-photo__paste, .pod-photo__pick, .pod-photo__zoom, .pod-photo__zoom-in, .pod-photo__rotate, .rl-pos__hide, .et-cell__clear, .et-cell__hit, .cmp-stat, .cmp-stats",
  );
  if (!ignored) {
    return false;
  }
  const slot = target.closest(`[${COMPOSER_SLOT_ATTR}]`);
  return ignored !== slot;
};

export const composerSlotClass = (
  index: number,
  draggingFrom: number | null,
  dropIndex: number | null,
) =>
  [
    draggingFrom === index ? "is-slot-dragging" : "",
    dropIndex === index ? "is-slot-drop" : "",
  ]
    .filter(Boolean)
    .join(" ");

export function useComposerSlotSwap(options: {
  enabled: boolean;
  onSwap?: (from: number, to: number) => void;
}) {
  const { enabled, onSwap } = options;
  const dragRef = useRef<{
    from: number;
    x: number;
    y: number;
    moved: boolean;
  } | null>(null);
  const onSwapRef = useRef(onSwap);
  onSwapRef.current = onSwap;
  const listenersRef = useRef<(() => void) | null>(null);
  const skipClickRef = useRef(false);
  const [draggingFrom, setDraggingFrom] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const stop = () => {
    listenersRef.current?.();
    listenersRef.current = null;
  };

  useEffect(() => () => stop(), []);

  const startDrag = (index: number, event: ReactPointerEvent) => {
    if (!enabled || !onSwapRef.current || event.button !== 0) {
      return;
    }
    if (isComposerSlotSwapIgnored(event.target)) {
      return;
    }
    stop();
    dragRef.current = {
      from: index,
      x: event.clientX,
      y: event.clientY,
      moved: false,
    };

    const onMove = (moveEvent: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) {
        return;
      }
      if (
        !drag.moved &&
        Math.hypot(moveEvent.clientX - drag.x, moveEvent.clientY - drag.y) >
          COMPOSER_SLOT_SWAP_THRESHOLD
      ) {
        drag.moved = true;
        setDraggingFrom(drag.from);
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }
      if (drag.moved) {
        moveEvent.preventDefault();
        const over = composerSlotFromPoint(moveEvent.clientX, moveEvent.clientY);
        setDropIndex(over != null && over !== drag.from ? over : null);
      }
    };

    const finish = (endEvent: PointerEvent) => {
      stop();
      const drag = dragRef.current;
      dragRef.current = null;
      setDropIndex(null);
      setDraggingFrom(null);
      if (!drag?.moved) {
        return;
      }
      skipClickRef.current = true;
      window.setTimeout(() => {
        skipClickRef.current = false;
      }, 0);
      const to = composerSlotFromPoint(endEvent.clientX, endEvent.clientY);
      const swap = onSwapRef.current;
      if (swap && to != null && to !== drag.from) {
        swap(drag.from, to);
      }
    };

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    listenersRef.current = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
    };
  };

  const skipClick = () => {
    if (!skipClickRef.current) {
      return false;
    }
    skipClickRef.current = false;
    return true;
  };

  return { draggingFrom, dropIndex, startDrag, skipClick };
}
