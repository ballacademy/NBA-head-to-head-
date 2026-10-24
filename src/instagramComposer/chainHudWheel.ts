const HUD_TRAP = [
  ".sc-tabs",
  ".sc-toolbar",
  ".sc-toolbar__body",
  ".sc-toolbar__scroll",
  ".sc-toolbar__pinned",
  ".sc-toolbar__row--actions",
  ".sc-grade",
  ".sc-field",
  ".sc-range",
  ".sc-stage",
].join(", ");

const KEEP_NATIVE = ".sc-picker, dialog, .sc-modal, .sc-hud-select__menu";

const canScrollY = (node: HTMLElement) =>
  node.scrollHeight > node.clientHeight + 1;

const canScrollX = (node: HTMLElement) =>
  node.scrollWidth > node.clientWidth + 1;

const isScrollPort = (node: HTMLElement, axis: "x" | "y") => {
  const style = getComputedStyle(node);
  const overflow = axis === "y" ? style.overflowY : style.overflowX;
  return overflow === "auto" || overflow === "scroll" || overflow === "overlay";
};

const atYEdge = (node: HTMLElement, deltaY: number) => {
  if (deltaY < 0) {
    return node.scrollTop <= 0;
  }
  return node.scrollTop + node.clientHeight >= node.scrollHeight - 1;
};

const atXEdge = (node: HTMLElement, deltaX: number) => {
  if (deltaX < 0) {
    return node.scrollLeft <= 0;
  }
  return node.scrollLeft + node.clientWidth >= node.scrollWidth - 1;
};

const nearestWorkingScroller = (
  start: Element,
  deltaX: number,
  deltaY: number,
): HTMLElement | null => {
  const vertical = Math.abs(deltaY) >= Math.abs(deltaX);
  let node: Element | null = start;
  while (node && node !== document.documentElement) {
    if (node instanceof HTMLElement) {
      if (vertical && isScrollPort(node, "y") && canScrollY(node) && !atYEdge(node, deltaY)) {
        return node;
      }
      if (!vertical && isScrollPort(node, "x") && canScrollX(node) && !atXEdge(node, deltaX)) {
        return node;
      }
    }
    node = node.parentElement;
  }
  return null;
};

/** Keep composer chrome sized to the visible viewport, including iOS keyboard. */
export const syncComposerVisualViewport = () => {
  const root = document.documentElement;
  const apply = () => {
    const viewport = window.visualViewport;
    const height = Math.round(viewport?.height ?? window.innerHeight);
    const offsetTop = Math.round(viewport?.offsetTop ?? 0);
    root.style.setProperty("--vvh", `${height}px`);
    root.style.setProperty("--vv-top", `${offsetTop}px`);
  };
  apply();
  window.visualViewport?.addEventListener("resize", apply);
  window.visualViewport?.addEventListener("scroll", apply);
  window.addEventListener("orientationchange", apply);
  return () => {
    window.visualViewport?.removeEventListener("resize", apply);
    window.visualViewport?.removeEventListener("scroll", apply);
    window.removeEventListener("orientationchange", apply);
  };
};

/** Nested overflow:auto / hidden HUD panels eat wheel even when they cannot scroll. */
export const chainHudWheel = (root: HTMLElement) => {
  const onWheel = (event: WheelEvent) => {
    if (event.ctrlKey || event.defaultPrevented) {
      return;
    }
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    if (target.closest(KEEP_NATIVE)) {
      return;
    }
    if (nearestWorkingScroller(target, event.deltaX, event.deltaY)) {
      return;
    }
    if (!target.closest(HUD_TRAP)) {
      return;
    }
    event.preventDefault();
    const page = document.scrollingElement ?? document.documentElement;
    page.scrollBy({ top: event.deltaY, left: event.deltaX });
  };

  root.addEventListener("wheel", onWheel, { passive: false });
  return () => root.removeEventListener("wheel", onWheel);
};
