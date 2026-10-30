export const COMPOSER_HOTKEY_FILL = "f";
export const COMPOSER_HOTKEY_EXPORT = "e";
export const COMPOSER_HOTKEY_UNDO = "z";

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
  if (event.metaKey || event.ctrlKey || event.altKey) {
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
  if (lower === COMPOSER_HOTKEY_FILL) {
    return "fill" as const;
  }
  if (lower === COMPOSER_HOTKEY_EXPORT) {
    return "export" as const;
  }
  if (lower === COMPOSER_HOTKEY_UNDO) {
    return "undo" as const;
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

const clickNamed = (root: ParentNode, names: string[]) => {
  const buttons = [...root.querySelectorAll("button")];
  const button = buttons.find((el) =>
    names.some((name) => (el.textContent || "").trim() === name),
  );
  button?.click();
  return Boolean(button);
};

export const runComposerHotkey = (
  action: NonNullable<ReturnType<typeof composerHotkeyAction>>,
  root: ParentNode,
) => {
  if (action === "fill") {
    return clickNamed(root, [
      "Fill last game",
      "Fill last night",
      "Fill shots",
      "Populate",
      "Fill",
      "Auto-fill",
    ]);
  }
  if (action === "export" || action === "ratio-4-5") {
    return clickNamed(root, ["Export PNG"]);
  }
  if (action === "undo") {
    return clickNamed(root, ["Undo"]);
  }
  if (action === "ratio-9-16") {
    return clickNamed(root, ["Export 9:16"]);
  }
  if (action === "ratio-1-1") {
    return clickNamed(root, ["Export 1:1"]);
  }
  return false;
};
