import {
  measureTitleAdvance,
  splitBalancedTitle,
} from "../instagramComposer/titleLayout";
import {
  GRAPHIC_ASPECT,
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  STORY_DESIGN_HEIGHT,
} from "../standingsComposer/rankingState";

export { GRAPHIC_ASPECT, GRAPHIC_HEIGHT, GRAPHIC_WIDTH, STORY_DESIGN_HEIGHT };

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
export const HL_TYPE_BOTTOM = 52;
export const HL_HEADLINE_H = 128;
export const HL_HEADLINE_SIZE = 62;
export const HL_HEADLINE_MIN = 30;
export const HL_HEADLINE_TRACK = 0.06;
export const HL_HEADLINE_PAD_X = 40;
/** Level plate — rotation shredded city / headline / nick. Skew is the poster cut. */
export const HL_PLATE_ROTATE = 0;
export const HL_PLATE_SKEW = 48;
export const HL_PLATE_FILL = "#ffffff";
export const HL_PLATE_INK = "#111111";
export const HL_BODY_SIZE = 28;
export const HL_BODY_TRACK = 0.08;
export const HL_BODY_LINE = 1.14;
export const HL_PLATE_BODY_GAP = 18;
export const HL_CITY_SIZE = 72;
export const HL_NICK_SIZE = 96;
/** Visible wordmark box vs font-size — city/nick sit outside the plate, not under it. */
export const HL_WORDMARK_CAP = 0.86;
export const HL_WORDMARK_LINE = HL_WORDMARK_CAP;
export const HL_TUCK = 0;
export const HL_CITY_OVERLAP = HL_TUCK;
export const HL_NICK_OVERLAP = HL_TUCK;
export const HL_STACK_GAP = 16;
export const HL_KICKER_GAP = 12;
export const HL_WORDMARK_TRACK = 0.02;
export const HL_KICKER_SIZE = 20;
export const HL_NAME_SIZE = 18;
export const HL_OPP_MARK = 32;
export const HL_WATERMARK_FAINT = 0.1;
export const HL_WATERMARK_MEDIUM = 0.22;
export const HL_MARK_BEHIND_SIZE = 440;
export const HL_FADE_H = 560;
export const HL_FACE_SAFE = 780;

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
  const extra = nameOnPlate ? HL_NAME_SIZE + 12 : 0;
  const base =
    fit.lines.length > 1
      ? Math.max(HL_HEADLINE_H, fit.size * fit.lines.length * 1.08 + 44)
      : HL_HEADLINE_H;
  return base + extra;
};

export const fitWordmarkSize = (
  text: string,
  maxSize: number,
  minSize = 32,
  maxWidth = GRAPHIC_WIDTH - HL_PAD_X * 2,
) => {
  const raw = text.replace(/\s+/g, " ").trim().toUpperCase();
  if (!raw) {
    return 0;
  }
  let size = maxSize;
  while (
    size > minSize &&
    measureTitleAdvance(raw, HL_WORDMARK_TRACK) * size > maxWidth
  ) {
    size -= 1;
  }
  return size;
};

export const wrapHeadlineBody = (
  body: string,
  size = HL_BODY_SIZE,
  maxLines = 3,
  maxWidth = GRAPHIC_WIDTH - HL_PAD_X * 2,
) => {
  const chunks = body
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const lines: string[] = [];
  for (const chunk of chunks) {
    const words = chunk.toUpperCase().split(" ").filter(Boolean);
    let current = "";
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (measureTitleAdvance(next, HL_BODY_TRACK) * size <= maxWidth) {
        current = next;
      } else {
        if (current) {
          lines.push(current);
        }
        current = word;
      }
    }
    if (current) {
      lines.push(current);
    }
  }
  return lines.slice(0, maxLines);
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
  city?: string;
  nick?: string;
  boardH?: number;
}

export interface HeadlineTypeStack {
  city: string;
  nick: string;
  citySize: number;
  nickSize: number;
  cityTop: number;
  cityBottom: number;
  nickTop: number;
  nickBottom: number;
  plateTop: number;
  plateBottom: number;
  kickerTop: number;
  kickerBottom: number;
  nameTop: number;
  nameBottom: number;
  bodyTop: number;
  bodyBottom: number;
  fadeAt: "top" | "bottom";
}

export interface HeadlineBox {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export const headlineBodyBlock = (bodyLines: number) =>
  bodyLines > 0 ? bodyLines * HL_BODY_SIZE * HL_BODY_LINE : 0;

export const headlineTypeStack = ({
  bodyLines,
  plateH = HL_HEADLINE_H,
  lockup = "bottom",
  kicker = false,
  nameUnder = false,
  city = "",
  nick = "",
  boardH = GRAPHIC_HEIGHT,
}: HeadlineStackOpts): HeadlineTypeStack => {
  const cityLabel = city.replace(/\s+/g, " ").trim().toUpperCase();
  const nickLabel = nick.replace(/\s+/g, " ").trim().toUpperCase();
  const citySize = fitWordmarkSize(cityLabel, HL_CITY_SIZE);
  const nickSize = fitWordmarkSize(nickLabel, HL_NICK_SIZE);
  const cityH = citySize ? citySize * HL_WORDMARK_CAP : 0;
  const nickH = nickSize ? nickSize * HL_WORDMARK_CAP : 0;
  const kickerH = kicker ? HL_KICKER_SIZE + 8 : 0;
  const nameH = nameUnder ? HL_NAME_SIZE + 8 : 0;
  const bodyH = headlineBodyBlock(bodyLines);

  if (lockup === "top") {
    let y = HL_BA_INSET + HL_BA_SIZE + 20;
    const kickerTop = kickerH ? y : y;
    const kickerBottom = kickerH ? y + kickerH : y;
    y = kickerH ? kickerBottom + HL_KICKER_GAP : y;
    const cityTop = y;
    const cityBottom = y + cityH;
    y = cityBottom;
    const plateTop = y;
    const plateBottom = y + plateH;
    y = plateBottom;
    const nickTop = y;
    const nickBottom = y + nickH;
    y = nickBottom;
    if (nameH || bodyH) {
      y += HL_STACK_GAP;
    }
    const nameTop = y;
    const nameBottom = y + nameH;
    y = nameH ? nameBottom + 8 : y;
    const bodyTop = y;
    const bodyBottom = y + bodyH;
    return {
      city: cityLabel,
      nick: nickLabel,
      citySize,
      nickSize,
      cityTop,
      cityBottom,
      nickTop,
      nickBottom,
      plateTop,
      plateBottom,
      kickerTop,
      kickerBottom,
      nameTop,
      nameBottom,
      bodyTop,
      bodyBottom,
      fadeAt: "top",
    };
  }

  let y = boardH - HL_TYPE_BOTTOM;
  const bodyBottom = y;
  const bodyTop = bodyH ? y - bodyH : y;
  y = bodyTop;
  if (nameH) {
    y -= 8;
  }
  const nameBottom = y;
  const nameTop = nameH ? y - nameH : y;
  y = nameH ? nameTop : y;
  if (bodyH || nameH) {
    y -= HL_STACK_GAP;
  }
  const nickBottom = y;
  const nickTop = nickH ? y - nickH : y;
  y = nickTop;
  const plateBottom = y;
  const plateTop = y - plateH;
  y = plateTop;
  const cityBottom = y;
  const cityTop = cityH ? y - cityH : y;
  y = cityTop;
  if (kickerH) {
    y -= HL_KICKER_GAP;
  }
  const kickerBottom = y;
  const kickerTop = kickerH ? y - kickerH : y;
  return {
    city: cityLabel,
    nick: nickLabel,
    citySize,
    nickSize,
    cityTop,
    cityBottom,
    nickTop,
    nickBottom,
    plateTop,
    plateBottom,
    kickerTop,
    kickerBottom,
    nameTop,
    nameBottom,
    bodyTop,
    bodyBottom,
    fadeAt: "bottom",
  };
};

export const boxesOverlap = (a: HeadlineBox, b: HeadlineBox) =>
  a.w > 0 &&
  b.w > 0 &&
  a.h > 0 &&
  b.h > 0 &&
  a.x < b.x + b.w &&
  a.x + a.w > b.x &&
  a.y < b.y + b.h &&
  a.y + a.h > b.y;

export const collidingHeadlineBoxes = (boxes: HeadlineBox[]) => {
  const hits: Array<[string, string]> = [];
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const left = boxes[i];
      const right = boxes[j];
      if (left && right && boxesOverlap(left, right)) {
        hits.push([left.id, right.id]);
      }
    }
  }
  return hits;
};

export const headlineVisibleTypeBoxes = (
  stack: HeadlineTypeStack,
  opts: { showBa?: boolean; hasKicker?: boolean; hasName?: boolean; hasBody?: boolean } = {},
): HeadlineBox[] => {
  const pad = HL_PAD_X;
  const w = GRAPHIC_WIDTH - pad * 2;
  const boxes: HeadlineBox[] = [];
  if (opts.showBa !== false) {
    boxes.push({
      id: "ba",
      x: HL_BA_INSET,
      y: HL_BA_INSET,
      w: HL_BA_SIZE,
      h: HL_BA_SIZE,
    });
  }
  if (opts.hasKicker && stack.kickerBottom > stack.kickerTop) {
    boxes.push({
      id: "kicker",
      x: pad,
      y: stack.kickerTop,
      w,
      h: stack.kickerBottom - stack.kickerTop,
    });
  }
  if (stack.cityBottom > stack.cityTop) {
    boxes.push({
      id: "city",
      x: pad,
      y: stack.cityTop,
      w,
      h: stack.cityBottom - stack.cityTop,
    });
  }
  boxes.push({
    id: "plate",
    x: pad,
    y: stack.plateTop,
    w,
    h: stack.plateBottom - stack.plateTop,
  });
  if (stack.nickBottom > stack.nickTop) {
    boxes.push({
      id: "nick",
      x: pad,
      y: stack.nickTop,
      w,
      h: stack.nickBottom - stack.nickTop,
    });
  }
  if (opts.hasName && stack.nameBottom > stack.nameTop) {
    boxes.push({
      id: "name",
      x: pad,
      y: stack.nameTop,
      w,
      h: stack.nameBottom - stack.nameTop,
    });
  }
  if (opts.hasBody !== false && stack.bodyBottom > stack.bodyTop) {
    boxes.push({
      id: "body",
      x: pad,
      y: stack.bodyTop,
      w,
      h: stack.bodyBottom - stack.bodyTop,
    });
  }
  return boxes.filter((box) => box.h > 0 && box.w > 0);
};

export const headlineWatermarkBox = (
  mode: HeadlineWatermark,
  stack: HeadlineTypeStack,
) => {
  const size = HL_MARK_BEHIND_SIZE;
  const cx = GRAPHIC_WIDTH / 2;
  const plateMid = (stack.plateTop + stack.plateBottom) / 2;
  let cy = plateMid;
  if (stack.fadeAt === "bottom") {
    cy = Math.max(plateMid, HL_FACE_SAFE + size * 0.18);
  } else {
    cy = Math.min(plateMid, HL_FACE_SAFE - size * 0.28);
  }
  const y = Math.max(HL_BA_INSET + HL_BA_SIZE + 8, cy - size / 2);
  return {
    size,
    x: cx - size / 2,
    y,
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
