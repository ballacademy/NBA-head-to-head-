import type { ComposerStatsSample } from "./composerStatsSample";

export const COMPOSER_TOAST_EVENT = "ddgm:composer-toast";

export const fillQualityMessage = (
  sample: ComposerStatsSample,
  games: Array<number | null | undefined>,
) => {
  const low = games.filter((gp) => typeof gp === "number" && gp > 0 && gp < 2)
    .length;
  const parts: string[] = [];
  if (sample === "preseason") {
    parts.push("Fill is preseason");
  }
  if (low) {
    parts.push(`${low} under 2 GP`);
  }
  return parts.length ? `${parts.join(" · ")}.` : null;
};

export const showComposerToast = (text: string) => {
  if (typeof window === "undefined" || !text.trim()) {
    return;
  }
  window.dispatchEvent(
    new CustomEvent(COMPOSER_TOAST_EVENT, { detail: text.trim() }),
  );
};
