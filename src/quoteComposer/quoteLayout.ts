import {
  formatComposerName,
  readComposerNameStyle,
  splitComposerPersonName,
  type ComposerNameStyle,
} from "../instagramComposer/composerNameStyle";
import {
  GRAPHIC_ASPECT,
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
} from "../standingsComposer/rankingState";

export { GRAPHIC_ASPECT, GRAPHIC_HEIGHT, GRAPHIC_WIDTH };

export const QT_BA_SIZE = 72;
export const QT_BA_INSET = 36;
export const QT_FADE_H = 560;
export const QT_QUOTE_SIZE = 70;
export const QT_QUOTE_SIZE_LONG = 56;
export const QT_QUOTE_TRACK = 0.02;
export const QT_QUOTE_LINE = 1.05;
export const QT_QUOTE_MAX_LINES = 3;
export const QT_QUOTE_LONG_MAX_LINES = 2;
export const QT_QUOTE_PAD_X = 72;
export const QT_QUOTE_BOTTOM = 88;
export const QT_QUOTE_SOURCE_GAP = 56;
export const QT_QUOTE_H = 220;
export const QT_MARK_SIZE = 72;
export const QT_MARK_GAP = 18;
export const QT_LAST_TOP = 128;
export const QT_LAST_SIZE = 96;
export const QT_LAST_LINE = 0.82;
export const QT_LAST_TRACK = 0.04;
export const QT_SOURCE_SIZE = 20;
export const QT_SOURCE_TRACK = 0.16;
export const QT_SOURCE_BOTTOM = 44;
export const QT_LONG_QUOTE_WORDS = 8;

export const quoteLastName = (
  attribution: string,
  style: ComposerNameStyle = "last",
) => {
  const names = splitComposerPersonName(attribution);
  return formatComposerName(names.firstName, names.lastName, style).toUpperCase();
};

export const quoteStyledName = (
  attribution: string,
  style: ComposerNameStyle = readComposerNameStyle(),
) => quoteLastName(attribution, style);

export const quoteWordCount = (quote: string) =>
  quote.replace(/\s+/g, " ").trim().split(" ").filter(Boolean).length;

export const isLongQuote = (quote: string) =>
  quoteWordCount(quote) > QT_LONG_QUOTE_WORDS;

export const quoteLastNameSize = (last: string, quote = "") => {
  let size = QT_LAST_SIZE;
  if (last.length >= 12) {
    size = 56;
  } else if (last.length >= 9) {
    size = 72;
  }
  if (isLongQuote(quote)) {
    size = Math.min(size, 52);
  }
  return size;
};

export const quoteTypeSize = (quote: string) =>
  isLongQuote(quote) ? QT_QUOTE_SIZE_LONG : QT_QUOTE_SIZE;

export const quoteMaxLines = (quote: string) =>
  isLongQuote(quote) ? QT_QUOTE_LONG_MAX_LINES : QT_QUOTE_MAX_LINES;

export const quoteBottom = (hasSource: boolean) =>
  hasSource ? QT_QUOTE_BOTTOM + QT_QUOTE_SOURCE_GAP : QT_QUOTE_BOTTOM;

export const formatQuoteSource = (source: string) => {
  const text = source.replace(/\s+/g, " ").trim();
  if (!text) {
    return "";
  }
  const stripped = text.replace(/^[-—–]+\s*/, "");
  return `— ${stripped}`.toUpperCase();
};
