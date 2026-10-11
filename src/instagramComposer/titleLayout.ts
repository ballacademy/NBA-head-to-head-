import type { ChangeEvent } from "react";

/** Generous on-graphic title cap — wrap onto two lines instead of clipping. */
export const COMPOSER_TITLE_MAX_LENGTH = 96;

/**
 * Relative advance widths for Montserrat Black uppercase. Used to pick the
 * word break whose two lines are closest in horizontal width.
 */
const TITLE_ADVANCE: Record<string, number> = {
  " ": 0.28,
  "'": 0.26,
  "-": 0.4,
  ".": 0.3,
  "!": 0.36,
  "?": 0.58,
  "&": 0.72,
  I: 0.36,
  J: 0.46,
  L: 0.5,
  T: 0.54,
  F: 0.56,
  E: 0.58,
  S: 0.6,
  Z: 0.6,
  P: 0.62,
  B: 0.64,
  R: 0.66,
  K: 0.66,
  X: 0.66,
  Y: 0.62,
  C: 0.68,
  G: 0.7,
  A: 0.68,
  V: 0.66,
  D: 0.7,
  H: 0.7,
  N: 0.7,
  U: 0.7,
  O: 0.74,
  Q: 0.74,
  M: 0.88,
  W: 0.96,
};

const DEFAULT_ADVANCE = 0.64;

export const measureTitleAdvance = (text: string, trackingEm = 0.02): number => {
  const chars = [...text];
  if (chars.length === 0) {
    return 0;
  }
  let width = 0;
  for (const char of chars) {
    width += TITLE_ADVANCE[char] ?? TITLE_ADVANCE[char.toUpperCase()] ?? DEFAULT_ADVANCE;
  }
  return width + Math.max(0, chars.length - 1) * trackingEm;
};

export const normalizeComposerTitle = (value: string, fallback = ""): string => {
  const text = value.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim().toUpperCase();
  return text || fallback;
};

/**
 * Keep the raw keystrokes. Uppercase is CSS `text-transform` so the caret
 * does not jump when a letter changes case on a controlled input.
 */
export const commitComposerText = (
  raw: string,
  maxLength = COMPOSER_TITLE_MAX_LENGTH,
): string => raw.replace(/[\r\n]+/g, " ").slice(0, maxLength);

export const onComposerTextChange = (
  event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  onChange: (value: string) => void,
  maxLength = COMPOSER_TITLE_MAX_LENGTH,
) => {
  onChange(commitComposerText(event.target.value, maxLength));
};

/**
 * Insert a newline at the same word break the overlay uses so a textarea’s
 * caret lands on the visible two-line title instead of the start of a
 * single hidden line.
 */
export const linedComposerTitle = (raw: string, lines: string[]): string => {
  const compact = raw.replace(/[\r\n]+/g, " ");
  if (lines.length < 2) {
    return compact;
  }
  const wordTarget = lines[0]!.split(" ").filter(Boolean).length;
  if (wordTarget < 1) {
    return compact;
  }
  const leading = compact.match(/^\s*/)?.[0] ?? "";
  const body = compact.slice(leading.length);
  const parts = body.split(/(\s+)/);
  let words = 0;
  let cut = leading.length;
  for (const part of parts) {
    if (!part) {
      continue;
    }
    if (/^\s+$/.test(part)) {
      if (words >= wordTarget) {
        break;
      }
      cut += part.length;
      continue;
    }
    words += 1;
    cut += part.length;
    if (words >= wordTarget) {
      break;
    }
  }
  const first = compact.slice(0, cut);
  const rest = compact.slice(cut).replace(/^\s+/, "");
  if (!rest) {
    return compact;
  }
  return `${first}\n${rest}`;
};

export const splitBalancedTitle = (
  title: string,
  fallback = "",
  trackingEm = 0.02,
): string[] => {
  const text = normalizeComposerTitle(title, fallback);
  if (!text) {
    return [""];
  }
  const words = text.split(" ").filter(Boolean);
  if (words.length < 2) {
    return [text];
  }

  let bestAt = 1;
  let bestScore = Number.POSITIVE_INFINITY;
  for (let index = 1; index < words.length; index += 1) {
    const first = words.slice(0, index).join(" ");
    const second = words.slice(index).join(" ");
    const score = Math.abs(
      measureTitleAdvance(first, trackingEm) - measureTitleAdvance(second, trackingEm),
    );
    if (score < bestScore) {
      bestScore = score;
      bestAt = index;
    }
  }
  return [words.slice(0, bestAt).join(" "), words.slice(bestAt).join(" ")];
};
