import {
  measureTitleAdvance,
  splitBalancedTitle,
} from "../instagramComposer/titleLayout";
import {
  GRAPHIC_ASPECT,
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
} from "../standingsComposer/rankingState";

export { GRAPHIC_ASPECT, GRAPHIC_HEIGHT, GRAPHIC_WIDTH };

export type HeadlineWatermark = "off" | "faint" | "medium";
export type HeadlinePlateColor = "white" | "team" | "black";
export type HeadlineLockup = "bottom" | "top";
export type HeadlineNamePlacement = "off" | "plate" | "under";
export type HeadlineKickerMode = "off" | "date" | "last-night";
export type HeadlineSubjectMode = "player" | "team";

export const HL_WATERMARK_MODES = ["faint", "medium", "off"] as const;
export const HL_PLATE_COLORS = ["white", "team", "black"] as const;

export const parseHeadlineWatermark = (value: unknown): HeadlineWatermark => {
  if (value === "off") {
    return "off";
  }
  if (value === "medium" || value === "small") {
    return "medium";
  }
  return "faint";
};

export const parseHeadlinePlateColor = (value: unknown): HeadlinePlateColor =>
  value === "team" || value === "black" ? value : "white";

export const parseHeadlineLockup = (value: unknown): HeadlineLockup =>
  value === "top" ? "top" : "bottom";

export const parseHeadlineNamePlacement = (
  value: unknown,
): HeadlineNamePlacement =>
  value === "plate" || value === "under" ? value : "off";

export const parseHeadlineKickerMode = (value: unknown): HeadlineKickerMode =>
  value === "date" || value === "last-night" ? value : "off";

export const parseHeadlineSubjectMode = (value: unknown): HeadlineSubjectMode =>
  value === "team" ? "team" : "player";

export const HL_PAD_X = 64;
export const HL_BA_SIZE = 72;
export const HL_BA_INSET = 36;
export const HL_TYPE_BOTTOM = 48;
export const HL_HEADLINE_H = 118;
export const HL_HEADLINE_SIZE = 56;
export const HL_HEADLINE_MIN = 30;
export const HL_HEADLINE_TRACK = 0.06;
export const HL_HEADLINE_PAD_X = 36;
export const HL_PLATE_ROTATE = -2.4;
export const HL_PLATE_SKEW = 22;
export const HL_PLATE_FILL = "#ffffff";
export const HL_PLATE_INK = "#111111";
export const HL_BODY_SIZE = 32;
export const HL_BODY_TRACK = 0.1;
export const HL_BODY_LINE = 1.12;
export const HL_PLATE_BODY_GAP = 22;
export const HL_CITY_SIZE = 70;
export const HL_NICK_SIZE = 94;
export const HL_WORDMARK_LINE = 0.82;
export const HL_CITY_OVERLAP = 34;
export const HL_NICK_OVERLAP = 40;
export const HL_WORDMARK_TRACK = 0.02;
export const HL_KICKER_SIZE = 22;
export const HL_NAME_SIZE = 20;
export const HL_OPP_MARK = 36;
export const HL_WATERMARK_FAINT = 0.12;
export const HL_WATERMARK_MEDIUM = 0.28;
export const HL_MARK_BEHIND_SIZE = 520;
export const HL_FADE_H = 500;
export const HL_FACE_SAFE = 720;

export interface HeadlineFit {
  lines: string[];
  size: number;
}

export const fitHeadlineType = (
  raw: string,
  maxWidth = GRAPHIC_WIDTH - HL_PAD_X * 2 - HL_HEADLINE_PAD_X * 2,
): HeadlineFit => {
  const text = raw.replace(/\s+/g, " ").trim().toUpperCase();
  if (!text) {
    return { lines: [""], size: HL_HEADLINE_SIZE };
  }
  const widthAt = (size: number, line: string) =>
    measureTitleAdvance(line, HL_HEADLINE_TRACK) * size;
  const fits = (size: number, lines: string[]) =>
    lines.every((line) => widthAt(size, line) <= maxWidth);

  let lines = [text];
  let size = HL_HEADLINE_SIZE;
  if (!fits(size, lines) && text.split(" ").filter(Boolean).length > 1) {
    lines = splitBalancedTitle(text, "", HL_HEADLINE_TRACK);
  }
  while (size > HL_HEADLINE_MIN && !fits(size, lines)) {
    size -= 2;
    if (
      lines.length === 1 &&
      text.split(" ").filter(Boolean).length > 1
    ) {
      lines = splitBalancedTitle(text, "", HL_HEADLINE_TRACK);
    }
  }
  return { lines, size };
};

export const headlinePlateHeight = (fit: HeadlineFit, nameOnPlate = false) => {
  const extra = nameOnPlate ? HL_NAME_SIZE + 10 : 0;
  const base =
    fit.lines.length > 1
      ? Math.max(HL_HEADLINE_H, fit.size * fit.lines.length * 1.05 + 36)
      : HL_HEADLINE_H;
  return base + extra;
};

export const plateFillHex = (
  color: HeadlinePlateColor,
  teamPrimary = "#ffffff",
) => {
  if (color === "black") {
    return "#0c0c0c";
  }
  if (color === "team") {
    return teamPrimary || "#ffffff";
  }
  return HL_PLATE_FILL;
};

export const plateInkHex = (fill: string) => {
  const raw = fill.replace("#", "");
  if (raw.length !== 6) {
    return HL_PLATE_INK;
  }
  const r = Number.parseInt(raw.slice(0, 2), 16) || 0;
  const g = Number.parseInt(raw.slice(2, 4), 16) || 0;
  const b = Number.parseInt(raw.slice(4, 6), 16) || 0;
  const l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return l > 0.58 ? HL_PLATE_INK : "#ffffff";
};

export const plateClipPolygon = (
  skew = HL_PLATE_SKEW,
  width = GRAPHIC_WIDTH - HL_PAD_X * 2,
) => {
  const t = ((skew / width) * 100).toFixed(2);
  const r = (100 - Number(t)).toFixed(2);
  return `${t}% 0%, ${r}% 0%, 100% 100%, 0% 100%`;
};

export interface HeadlineStackOpts {
  bodyLines: number;
  plateH?: number;
  lockup?: HeadlineLockup;
  kicker?: boolean;
  nameUnder?: boolean;
}

export const headlineBodyBlock = (bodyLines: number) =>
  bodyLines > 0
    ? bodyLines * HL_BODY_SIZE * HL_BODY_LINE + HL_PLATE_BODY_GAP
    : 0;

export const headlineTypeStack = ({
  bodyLines,
  plateH = HL_HEADLINE_H,
  lockup = "bottom",
  kicker = false,
  nameUnder = false,
}: HeadlineStackOpts) => {
  const bodyBlock = headlineBodyBlock(bodyLines);
  const nickH = HL_NICK_SIZE * HL_WORDMARK_LINE;
  const cityH = HL_CITY_SIZE * HL_WORDMARK_LINE;
  const kickerH = kicker ? HL_KICKER_SIZE + 14 : 0;
  const nameH = nameUnder ? HL_NAME_SIZE + 10 : 0;
  if (lockup === "top") {
    const cityTop = HL_BA_INSET + HL_BA_SIZE + 18 + kickerH;
    const cityBottom = cityTop + cityH;
    const plateTop = cityBottom - HL_CITY_OVERLAP;
    const plateBottom = plateTop + plateH;
    const nickTop = plateBottom - HL_NICK_OVERLAP;
    const nickBottom = nickTop + nickH;
    const nameTop = nickBottom + 8;
    const bodyTop = nickBottom + (nameH || HL_PLATE_BODY_GAP);
    return {
      cityTop,
      cityBottom,
      nickTop,
      nickBottom,
      plateTop,
      plateBottom,
      kickerTop: cityTop - kickerH,
      nameTop,
      bodyTop,
      fadeAt: "top" as const,
    };
  }
  const nickBottom = GRAPHIC_HEIGHT - HL_TYPE_BOTTOM - bodyBlock - nameH;
  const nickTop = nickBottom - nickH;
  const plateBottom = nickTop + HL_NICK_OVERLAP;
  const plateTop = plateBottom - plateH;
  const cityBottom = plateTop + HL_CITY_OVERLAP;
  const cityTop = cityBottom - cityH;
  const nameTop = nickBottom + 8;
  const bodyTop = nickBottom + (nameH || HL_PLATE_BODY_GAP);
  return {
    cityTop,
    cityBottom,
    nickTop,
    nickBottom,
    plateTop,
    plateBottom,
    kickerTop: cityTop - kickerH,
    nameTop,
    bodyTop,
    fadeAt: "bottom" as const,
  };
};

export const headlineWatermarkBox = (
  mode: HeadlineWatermark,
  stack: ReturnType<typeof headlineTypeStack>,
) => {
  const size = HL_MARK_BEHIND_SIZE;
  const cx = GRAPHIC_WIDTH / 2;
  let cy = (stack.plateTop + stack.plateBottom) / 2;
  if (stack.fadeAt === "bottom") {
    cy = Math.max(cy, HL_FACE_SAFE + size * 0.28);
  } else {
    cy = Math.min(cy, HL_FACE_SAFE - size * 0.35);
  }
  return {
    size,
    x: cx - size / 2,
    y: cy - size / 2,
    opacity: mode === "medium" ? HL_WATERMARK_MEDIUM : HL_WATERMARK_FAINT,
  };
};

export const headlineDateKicker = (
  iso: string | null | undefined,
  mode: HeadlineKickerMode,
  now = new Date(),
) => {
  if (mode === "off") {
    return "";
  }
  if (mode === "last-night") {
    return "LAST NIGHT";
  }
  const match = String(iso ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    const month = now.toLocaleString("en-US", { month: "short" }).toUpperCase();
    return `${month} ${now.getDate()}`;
  }
  const months = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];
  return `${months[Number(match[2]) - 1]} ${Number(match[3])}`;
};
