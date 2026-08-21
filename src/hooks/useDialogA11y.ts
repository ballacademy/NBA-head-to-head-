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
  roots: Iterable<() => HTMLElement | null>,
) => {
  if (!(target instanceof Node)) {
    return false;
  }

  for (const getRoot of roots) {
    const root = getRoot();
    if (!root?.contains(target)) {
      continue;
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
  }

  return false;
};

type OverflowSnapshot = { node: HTMLElement; overflow: string };

/** Nested dialogs (private modal + matchmaking) must share one lock. */
let scrollLockCount = 0;
let overflowSnapshot: OverflowSnapshot[] | null = null;
const activeDialogRoots = new Set<() => HTMLElement | null>();
let preventBackgroundScroll: ((event: Event) => void) | null = null;

const collectLockTargets = () => [
  document.documentElement,
  document.body,
  ...document.querySelectorAll<HTMLElement>(".landing-hub-scroll"),
];

const applyScrollLock = () => {
  overflowSnapshot = collectLockTargets().map((node) => ({
    node,
    overflow: node.style.overflow,
  }));
  for (const { node } of overflowSnapshot) {
    node.style.overflow = "hidden";
  }
  document.documentElement.classList.add("ddgm-dialog-open");
  document.body.classList.add("ddgm-dialog-open");

  preventBackgroundScroll = (event: Event) => {
    if (eventAllowsInnerScroll(event.target, activeDialogRoots)) {
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
};

const releaseScrollLock = () => {
  if (overflowSnapshot) {
    for (const { node, overflow } of overflowSnapshot) {
      node.style.overflow = overflow;
    }
    overflowSnapshot = null;
  }

  document.documentElement.classList.remove("ddgm-dialog-open");
  document.body.classList.remove("ddgm-dialog-open");

  if (preventBackgroundScroll) {
    document.removeEventListener("wheel", preventBackgroundScroll, true);
    document.removeEventListener("touchmove", preventBackgroundScroll, true);
    preventBackgroundScroll = null;
  }
};

/**
 * Reference-counted body/hub scroll freeze. Safe when PrivateMatchModal and
 * MatchmakingOverlay both lock at once — unlocking one must not restore
 * `overflow: hidden` captured from the other.
 */
export const lockBackgroundScroll = (
  getDialogRoot: () => HTMLElement | null,
) => {
  activeDialogRoots.add(getDialogRoot);
  scrollLockCount += 1;

  if (scrollLockCount === 1) {
    applyScrollLock();
  }

  return () => {
    activeDialogRoots.delete(getDialogRoot);
    scrollLockCount = Math.max(0, scrollLockCount - 1);
    if (scrollLockCount === 0) {
      releaseScrollLock();
    }
  };
};

/** Hard reset for pages that must scroll (e.g. match results after private). */
export const forceUnlockBackgroundScroll = () => {
  activeDialogRoots.clear();
  scrollLockCount = 0;
  releaseScrollLock();
  // Also clear leftover inline overflow / listeners if a prior unlock left the
  // page stuck without an active snapshot (legacy nested-lock bug).
  for (const node of collectLockTargets()) {
    if (node.style.overflow === "hidden") {
      node.style.overflow = "";
    }
  }
  document.documentElement.classList.remove("ddgm-dialog-open");
  document.body.classList.remove("ddgm-dialog-open");
};

/** Test helper — do not use in product code. */
export const resetBackgroundScrollLockForTests = () => {
  forceUnlockBackgroundScroll();
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
