export const COMPOSER_HOTKEY_FILL = "f";
export const COMPOSER_HOTKEY_EXPORT = "e";
export const COMPOSER_HOTKEY_UNDO = "z";
export const COMPOSER_HOTKEY_REDO = "y";

export const isComposerTypingTarget = (target: EventTarget | null) => {
  if (typeof Element === "undefined" || !(target instanceof Element)) {
    return false;
  }
  const el = target as HTMLElement;
  if (el.isContentEditable) {
    return true;
  }
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
    return true;
  }
  return Boolean(
    el.closest(
      "input, textarea, select, [contenteditable='true'], .sc-hud-select, .sc-hud-select__menu",
    ),
  );
};

export const composerHotkeyAction = (event: KeyboardEvent) => {
  if (event.altKey) {
    return null;
  }
  if (isComposerTypingTarget(event.target)) {
    return null;
  }
  const key = event.key;
  if (key === "Escape") {
    return "focus-off" as const;
  }
  const lower = key.toLowerCase();
  const modified = event.metaKey || event.ctrlKey;
  if (lower === COMPOSER_HOTKEY_UNDO) {
    return event.shiftKey ? ("redo" as const) : ("undo" as const);
  }
  if (modified && lower === COMPOSER_HOTKEY_REDO) {
    return "redo" as const;
  }
  if (modified) {
    return null;
  }
  if (lower === COMPOSER_HOTKEY_FILL) {
    return "fill" as const;
  }
  if (lower === COMPOSER_HOTKEY_EXPORT) {
    return "export" as const;
  }
  if (key === "1") {
    return "ratio-4-5" as const;
  }
  if (key === "2") {
    return "ratio-9-16" as const;
  }
  if (key === "3") {
    return "ratio-1-1" as const;
  }
  return null;
};

const buttonLabel = (el: Element) =>
  (el.textContent || "").replace(/\s+/g, " ").trim();

/** Specific Fill labels first so F does not land on a generic Fill. */
export const COMPOSER_HOTKEY_FILL_LABELS = [
  "Fill East",
  "Fill West",
  "Fill range",
  "Fill cover",
  "Fill names",
  "Fill ranking",
  "Fill schedule",
  "Fill report",
  "Fill last game",
  "Fill last night",
  "Fill shots",
  "Populate matching",
  "Populate",
  "Auto-fill 7–10",
  "Auto-fill 7-10",
  "Sort into tiers",
  "Fill",
  "Auto-fill",
] as const;

const clickNamed = (root: ParentNode, labels: readonly string[]) => {
  for (const label of labels) {
    const button = Array.from(root.querySelectorAll("button")).find((el) => {
      if ((el as HTMLButtonElement).disabled) {
        return false;
      }
      return buttonLabel(el) === label;
    });
    if (button) {
      button.click();
      return true;
    }
  }
  return false;
};

export const runComposerHotkey = (
  action: NonNullable<ReturnType<typeof composerHotkeyAction>>,
  root: ParentNode,
) => {
  if (action === "fill") {
    return clickNamed(root, COMPOSER_HOTKEY_FILL_LABELS);
  }
  if (action === "export" || action === "ratio-4-5") {
    return clickNamed(root, ["Export PNG"]);
  }
  if (action === "undo") {
    return clickNamed(root, ["Undo"]);
  }
  if (action === "redo") {
    return clickNamed(root, ["Redo"]);
  }
  if (action === "ratio-9-16") {
    return (
      clickNamed(root, ["Export 9:16"]) || clickNamed(root, ["Export pack"])
    );
  }
  if (action === "ratio-1-1") {
    return (
      clickNamed(root, ["Export 1:1"]) || clickNamed(root, ["Export pack"])
    );
  }
  return false;
};
