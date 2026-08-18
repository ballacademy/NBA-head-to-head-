import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const isElementScrollable = (element: HTMLElement) =>
  element.scrollHeight - element.clientHeight > 1;

const eventAllowsInnerScroll = (
  target: EventTarget | null,
  root: HTMLElement | null,
) => {
  if (!(target instanceof Node) || !root?.contains(target)) {
    return false;
  }

  let node: Node | null = target;
  while (node instanceof HTMLElement && root.contains(node)) {
    if (isElementScrollable(node)) {
      return true;
    }
    if (node === root) {
      break;
    }
    node = node.parentElement;
  }

  return false;
};

const lockBackgroundScroll = (getDialogRoot: () => HTMLElement | null) => {
  const locked = [
    document.documentElement,
    document.body,
    ...document.querySelectorAll<HTMLElement>(".landing-hub-scroll"),
  ];
  const previousOverflow = locked.map((node) => node.style.overflow);
  locked.forEach((node) => {
    node.style.overflow = "hidden";
  });
  document.documentElement.classList.add("ddgm-dialog-open");
  document.body.classList.add("ddgm-dialog-open");

  const preventBackgroundScroll = (event: Event) => {
    if (eventAllowsInnerScroll(event.target, getDialogRoot())) {
      return;
    }
    event.preventDefault();
  };

  document.addEventListener("wheel", preventBackgroundScroll, {
    capture: true,
    passive: false,
  });
  document.addEventListener("touchmove", preventBackgroundScroll, {
    capture: true,
    passive: false,
  });

  return () => {
    locked.forEach((node, index) => {
      node.style.overflow = previousOverflow[index] ?? "";
    });
    document.documentElement.classList.remove("ddgm-dialog-open");
    document.body.classList.remove("ddgm-dialog-open");
    document.removeEventListener("wheel", preventBackgroundScroll, true);
    document.removeEventListener("touchmove", preventBackgroundScroll, true);
  };
};

export type UseDialogA11yOptions = {
  open?: boolean;
  onClose: () => void;
  /** When true, Escape does not close (busy / required choice). */
  disableClose?: boolean;
  closeOnEscape?: boolean;
  trapFocus?: boolean;
  restoreFocus?: boolean;
  /** Prefer this node for initial focus; otherwise first focusable in container. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Dialog root used for focus trap + initial focus fallback. */
  containerRef?: RefObject<HTMLElement | null>;
  /** Freeze the page behind the dialog (hub scroll + body). */
  lockScroll?: boolean;
};

/**
 * Shared dialog a11y: Escape, initial focus, optional Tab trap, restore focus.
 */
export const useDialogA11y = ({
  open = true,
  onClose,
  disableClose = false,
  closeOnEscape = true,
  trapFocus = true,
  restoreFocus = true,
  initialFocusRef,
  containerRef,
  lockScroll = false,
}: UseDialogA11yOptions) => {
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const localContainerRef = useRef<HTMLElement | null>(null);
  const resolvedContainerRef = containerRef ?? localContainerRef;

  useEffect(() => {
    if (!open) {
      return;
    }

    const active = document.activeElement;
    previouslyFocusedRef.current =
      active instanceof HTMLElement ? active : null;

    const focusInitial = () => {
      const preferred = initialFocusRef?.current;
      if (preferred) {
        preferred.focus();
        return;
      }
      const root = resolvedContainerRef.current;
      if (!root) {
        return;
      }
      const first = root.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      first?.focus();
    };

    // Defer so portal content is mounted.
    const focusTimer = window.setTimeout(focusInitial, 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (
        closeOnEscape &&
        !disableClose &&
        event.key === "Escape"
      ) {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }

      if (!trapFocus || event.key !== "Tab") {
        return;
      }

      const root = resolvedContainerRef.current;
      if (!root) {
        return;
      }

      const focusable = [
        ...root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ].filter(
        (node) =>
          !node.hasAttribute("disabled") &&
          node.getAttribute("aria-hidden") !== "true" &&
          node.tabIndex !== -1,
      );

      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      const current = document.activeElement;

      if (event.shiftKey) {
        if (current === first || !root.contains(current)) {
          event.preventDefault();
          last.focus();
        }
        return;
      }

      if (current === last || !root.contains(current)) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown, true);

    const scrollUnlock =
      lockScroll && typeof document !== "undefined"
        ? lockBackgroundScroll(() => resolvedContainerRef.current)
        : null;

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKeyDown, true);
      scrollUnlock?.();
      if (restoreFocus) {
        previouslyFocusedRef.current?.focus?.();
      }
    };
  }, [
    closeOnEscape,
    disableClose,
    initialFocusRef,
    lockScroll,
    onClose,
    open,
    resolvedContainerRef,
    restoreFocus,
    trapFocus,
  ]);

  return { containerRef: resolvedContainerRef };
};
