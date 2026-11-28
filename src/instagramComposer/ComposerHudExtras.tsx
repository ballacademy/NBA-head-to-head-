import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface ComposerHudExtraItem {
  key: string;
  label: string;
  on: boolean;
  onChange: (on: boolean) => void;
}

interface ComposerHudExtrasProps {
  label: string;
  items: ComposerHudExtraItem[];
  ariaLabel?: string;
}

const MENU_GAP = 6;
const MENU_MARGIN = 8;
const HUD_SELECT_EVENT = "ddgm:composer-hud-select";

const extrasSummary = (items: ComposerHudExtraItem[]) => {
  const onLabels = items.filter((item) => item.on).map((item) => item.label);
  if (!onLabels.length) {
    return "Off";
  }
  if (onLabels.length <= 2) {
    return onLabels.join(" · ");
  }
  return `${onLabels.length} on`;
};

export function ComposerHudExtras({
  label,
  items,
  ariaLabel,
}: ComposerHudExtrasProps) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<{
    top: number;
    left: number;
    minWidth: number;
    maxHeight: number;
  } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const groupLabel = ariaLabel ?? label;
  const current = extrasSummary(items);

  const close = () => setOpen(false);

  const updateMenuPosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) {
      return;
    }
    const rect = trigger.getBoundingClientRect();
    const viewportWidth =
      window.visualViewport?.width ?? document.documentElement.clientWidth;
    const viewportHeight =
      window.visualViewport?.height ?? document.documentElement.clientHeight;
    const viewportLeft = window.visualViewport?.offsetLeft ?? 0;
    const viewportTop = window.visualViewport?.offsetTop ?? 0;
    const minWidth = Math.max(rect.width, 148);
    const maxLeft = viewportLeft + viewportWidth - minWidth - MENU_MARGIN;
    const left = Math.max(
      viewportLeft + MENU_MARGIN,
      Math.min(rect.left, maxLeft),
    );
    let top = rect.bottom + MENU_GAP;
    const optionHeight = window.matchMedia("(max-width: 900px)").matches
      ? 44
      : 36;
    const estimatedHeight = Math.min(
      320,
      12 + items.length * optionHeight,
      viewportHeight - MENU_MARGIN * 2,
    );
    if (top + estimatedHeight > viewportTop + viewportHeight - MENU_MARGIN) {
      top = Math.max(
        viewportTop + MENU_MARGIN,
        rect.top - estimatedHeight - MENU_GAP,
      );
    }
    setMenuStyle({
      top,
      left,
      minWidth,
      maxHeight: estimatedHeight,
    });
  };

  useLayoutEffect(() => {
    if (!open) {
      setMenuStyle(null);
      return;
    }
    updateMenuPosition();
    window.dispatchEvent(
      new CustomEvent(HUD_SELECT_EVENT, { detail: listId }),
    );
    const reposition = () => updateMenuPosition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    window.visualViewport?.addEventListener("resize", reposition);
    window.visualViewport?.addEventListener("scroll", reposition);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
      window.visualViewport?.removeEventListener("resize", reposition);
      window.visualViewport?.removeEventListener("scroll", reposition);
    };
  }, [listId, open, items.length]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPeerOpen = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== listId) {
        close();
      }
    };
    const onPointer = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (
        rootRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close();
        triggerRef.current?.focus();
      }
    };
    window.addEventListener(HUD_SELECT_EVENT, onPeerOpen);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(HUD_SELECT_EVENT, onPeerOpen);
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [listId, open]);

  const menu =
    open && menuStyle && typeof document !== "undefined"
      ? createPortal(
          <ul
            ref={menuRef}
            id={listId}
            className="sc-hud-select__menu"
            role="listbox"
            aria-label={groupLabel}
            aria-multiselectable="true"
            style={{
              top: menuStyle.top,
              left: menuStyle.left,
              minWidth: menuStyle.minWidth,
              maxHeight: menuStyle.maxHeight,
            }}
          >
            {items.map((item) => (
              <li key={item.key} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={item.on}
                  className={
                    item.on
                      ? "sc-hud-select__option is-on"
                      : "sc-hud-select__option"
                  }
                  onClick={() => item.onChange(!item.on)}
                >
                  {item.label}
                  <span className="sc-hud-select__extra-state">
                    {item.on ? "On" : "Off"}
                  </span>
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )
      : null;

  return (
    <div
      ref={rootRef}
      className="sc-look sc-look--select"
      role="group"
      aria-label={groupLabel}
    >
      <span className="sc-look__label">{label}</span>
      <div className="sc-hud-select">
        <button
          ref={triggerRef}
          type="button"
          className={
            open
              ? "sc-chip sc-hud-select__trigger is-on"
              : "sc-chip sc-hud-select__trigger"
          }
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((currentOpen) => !currentOpen)}
        >
          <span className="sc-hud-select__value">{current}</span>
          <span className="sc-hud-select__caret" aria-hidden="true" />
        </button>
        {menu}
      </div>
    </div>
  );
}
