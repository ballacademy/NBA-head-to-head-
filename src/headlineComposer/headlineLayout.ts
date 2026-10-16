import { getTeamColors } from "../lib/teamColors";
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
export type HeadlineBoardMode = "split" | "team-only" | "trade";
export type HeadlineNameScope = "auto" | "city" | "nick" | "short" | "player";
export type HeadlineNameStack = "hurts" | "even";

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

export const parseHeadlineBoardMode = (value: unknown): HeadlineBoardMode =>
  value === "team-only" || value === "trade" ? value : "split";

export const parseHeadlineNameScope = (value: unknown): HeadlineNameScope =>
  value === "city" ||
  value === "nick" ||
  value === "short" ||
  value === "auto"
    ? value
    : "player";

export const parseHeadlineNameStack = (value: unknown): HeadlineNameStack =>
  value === "even" ? "even" : "hurts";

export const parseHeadlinePanelLeft = (value: unknown) => value === true;

/** Photo | panel split — Hurts/Eagles BREAKING crop, NBA. */
export const HL_SPLIT_X = 652;
export const HL_BA_SIZE = 56;
export const HL_BA_INSET = 28;
export const HL_CHEVRON_H = 120;
export const HL_CHEVRON_NOTCH = 96;
export const HL_CHEVRON_RISE = 82;
export const HL_CHEVRON_TOP = 700;
export const HL_HEADLINE_SIZE = 54;
export const HL_HEADLINE_MIN = 26;
export const HL_HEADLINE_TRACK = 0.04;
export const HL_GIVEN_SIZE = 40;
export const HL_FAMILY_SIZE = 72;
export const HL_NAME_TRACK = 0.1;
export const HL_FAMILY_TRACK = 0.06;
/** Floor so long lockups (TIMBERWOLVES) still sit on the panel. */
export const HL_STACK_MIN = 14;
/** Real Montserrat Black runs a bit wider than the advance table. */
export const HL_STACK_FIT = 0.88;
export const HL_BODY_SIZE = 28;
export const HL_BODY_TRACK = 0.05;
export const HL_BODY_LINE = 1.14;
export const HL_STORY_SIZE = 30;
export const HL_META_SIZE = 20;
export const HL_SOURCE_SIZE = 16;
export const HL_NICK_AUTO_MIN = 58;
export const HL_TYPE_PAD = 38;
export const HL_TYPE_RIGHT = 28;
export const HL_LOGO_SIZE = 680;
export const HL_PANEL_FALLBACK = "#101820";
export const HL_CHEVRON_INK = "#111111";
export const HL_PLATE_INK = "#111111";
export const HL_PLATE_FILL = "#d8dee4";

export interface HeadlineFit {
  lines: string[];
  size: number;
}

export const headlinePanelTypeWidth = (splitX = HL_SPLIT_X) =>
  GRAPHIC_WIDTH - splitX - HL_TYPE_PAD - HL_TYPE_RIGHT;

export const fitHeadlineType = (
  raw: string,
  maxWidth = headlinePanelTypeWidth() - 8,
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
    if (lines.length === 1 && text.split(" ").filter(Boolean).length > 1) {
      lines = splitBalancedTitle(text, "", HL_HEADLINE_TRACK);
    }
  }
  return { lines, size };
};

export interface StackedFit {
  lines: string[];
  size: number;
}

/** Shrink, then two-line wrap, so stacked names never clip off the panel. */
export const fitStackedLockup = (
  text: string,
  maxSize: number,
  tracking: number,
  maxWidth: number,
  minSize = HL_STACK_MIN,
): StackedFit => {
  const raw = text.replace(/\s+/g, " ").trim().toUpperCase();
  if (!raw) {
    return { lines: [], size: 0 };
  }
  const limit = maxWidth * HL_STACK_FIT;
  const widthAt = (size: number, line: string) =>
    measureTitleAdvance(line, tracking) * size;
  const fits = (size: number, lines: string[]) =>
    lines.length > 0 && lines.every((line) => widthAt(size, line) <= limit);

  let lines = [raw];
  let size = maxSize;
  const words = raw.split(" ").filter(Boolean);
  if (!fits(size, lines) && words.length > 1) {
    lines = splitBalancedTitle(raw, "", tracking);
  }
  while (size > minSize && !fits(size, lines)) {
    size -= 1;
  }
  if (!fits(size, lines) && size > 10) {
    while (size > 10 && !fits(size, lines)) {
      size -= 1;
    }
  }
  return { lines, size };
};

export const fitStackedName = (
  text: string,
  maxSize: number,
  tracking: number,
  maxWidth: number,
  minSize = HL_STACK_MIN,
) => fitStackedLockup(text, maxSize, tracking, maxWidth, minSize).size;

export const wrapHeadlineBody = (
  body: string,
  size = HL_BODY_SIZE,
  maxLines = 4,
  maxWidth = headlinePanelTypeWidth(),
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

const mixHex = (hex: string, into: string, amount: number) => {
  const parse = (value: string) => {
    const raw = value.replace("#", "");
    if (raw.length !== 6) {
      return { r: 16, g: 24, b: 32 };
    }
    return {
      r: Number.parseInt(raw.slice(0, 2), 16) || 0,
      g: Number.parseInt(raw.slice(2, 4), 16) || 0,
      b: Number.parseInt(raw.slice(4, 6), 16) || 0,
    };
  };
  const a = parse(hex);
  const b = parse(into);
  const t = Math.max(0, Math.min(1, amount));
  const channel = (from: number, to: number) =>
    Math.round(from + (to - from) * t)
      .toString(16)
      .padStart(2, "0");
  return `#${channel(a.r, b.r)}${channel(a.g, b.g)}${channel(a.b, b.b)}`;
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

/** Dark team-color panel so white stacked type reads. Light primaries get pulled down. */
export const headlinePanelHex = (teamId: string | null) => {
  if (!teamId) {
    return HL_PANEL_FALLBACK;
  }
  const { primary } = getTeamColors(teamId);
  if (plateInkHex(primary) === "#ffffff") {
    return primary;
  }
  return mixHex(primary, "#07090c", 0.58);
};

export const chevronClipPolygon = (
  rise = HL_CHEVRON_RISE,
  width = GRAPHIC_WIDTH - (HL_SPLIT_X - HL_CHEVRON_NOTCH),
  mirror = false,
) => {
  const t = ((rise / Math.max(1, width)) * 100).toFixed(2);
  if (mirror) {
    const edge = (100 - Number(t)).toFixed(2);
    return `0% 0%, ${edge}% 0%, 100% 50%, ${edge}% 100%, 0% 100%`;
  }
  return `0% 50%, ${t}% 0%, 100% 0%, 100% 100%, ${t}% 100%`;
};

export interface HeadlineBox {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface HeadlineSplitOpts {
  headline?: string;
  body?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  nick?: string;
  shortName?: string;
  boardH?: number;
  showBa?: boolean;
  panelLeft?: boolean;
  boardMode?: HeadlineBoardMode;
  nameStack?: HeadlineNameStack;
  storyLine?: string;
  metaLine?: string;
  sourceCredit?: string;
}

export interface HeadlineSplitLayout {
  boardW: number;
  boardH: number;
  splitX: number;
  panelLeft: boolean;
  boardMode: HeadlineBoardMode;
  photo: HeadlineBox;
  panel: HeadlineBox;
  panelB: HeadlineBox;
  chevron: HeadlineBox & { notch: number; rise: number; mirror: boolean };
  logo: { x: number; y: number; size: number };
  logoB: { x: number; y: number; size: number };
  kicker: HeadlineBox & { size: number; lines: string[] };
  story: HeadlineBox & { size: number; text: string };
  given: HeadlineBox & { size: number; text: string; lines: string[] };
  family: HeadlineBox & { size: number; text: string; lines: string[] };
  meta: HeadlineBox & { size: number; text: string };
  body: HeadlineBox & { lines: string[] };
  source: HeadlineBox & { size: number; text: string };
  ba: HeadlineBox;
}

export const headlineBodyBlock = (bodyLines: number) =>
  bodyLines > 0 ? bodyLines * HL_BODY_SIZE * HL_BODY_LINE : 0;

export const headlineSplitLayout = ({
  headline = "",
  body = "",
  firstName = "",
  lastName = "",
  city = "",
  nick = "",
  shortName = "",
  boardH = GRAPHIC_HEIGHT,
  showBa = true,
  panelLeft = false,
  boardMode = "split",
  nameStack = "hurts",
  storyLine = "",
  metaLine = "",
  sourceCredit = "",
}: HeadlineSplitOpts = {}): HeadlineSplitLayout => {
  const mode = parseHeadlineBoardMode(boardMode);
  const teamOnly = mode === "team-only";
  const trade = mode === "trade";
  const photoW = teamOnly ? 0 : HL_SPLIT_X;
  const panelW = GRAPHIC_WIDTH - photoW;
  const photoX = panelLeft && !teamOnly ? panelW : 0;
  const panelX = panelLeft && !teamOnly ? 0 : photoW;
  const typeW = Math.max(
    200,
    (teamOnly ? GRAPHIC_WIDTH - HL_SPLIT_X : panelW) - HL_TYPE_PAD - HL_TYPE_RIGHT,
  );
  const typeX = teamOnly
    ? HL_SPLIT_X + HL_TYPE_PAD
    : panelX + HL_TYPE_PAD;
  const kickerFit = fitHeadlineType(headline, typeW - 4);
  const chevronH =
    kickerFit.lines.length > 1 ? HL_CHEVRON_H + 28 : HL_CHEVRON_H;
  const chevronTop = HL_CHEVRON_TOP;
  const notch = HL_CHEVRON_NOTCH;
  const chevronX = teamOnly
    ? Math.max(0, HL_SPLIT_X - notch)
    : panelLeft
      ? 0
      : Math.max(0, panelX - notch);
  const chevronW = teamOnly
    ? GRAPHIC_WIDTH - chevronX
    : panelLeft
      ? panelW + notch
      : GRAPHIC_WIDTH - chevronX;
  const givenMax = nameStack === "even" ? 52 : HL_GIVEN_SIZE;
  const familyMax = nameStack === "even" ? 52 : HL_FAMILY_SIZE;
  const givenText = firstName.replace(/\s+/g, " ").trim().toUpperCase();
  const familyText = lastName.replace(/\s+/g, " ").trim().toUpperCase();
  const cityText = city.replace(/\s+/g, " ").trim().toUpperCase();
  const nickText = nick.replace(/\s+/g, " ").trim().toUpperCase();
  const shortText = shortName.replace(/\s+/g, " ").trim().toUpperCase();
  const stackedGiven = givenText || (!familyText ? cityText : "");
  const stackedFamily = familyText || nickText || shortText;
  const givenFit = fitStackedLockup(
    stackedGiven,
    givenMax,
    HL_NAME_TRACK,
    typeW,
  );
  const familyFit = fitStackedLockup(
    stackedFamily,
    familyMax,
    HL_FAMILY_TRACK,
    typeW,
  );
  const givenSize = givenFit.size;
  const familySize = familyFit.size;
  const givenH = givenSize
    ? givenSize * 1.08 * Math.max(1, givenFit.lines.length)
    : 0;
  const familyH = familySize
    ? familySize * 0.98 * Math.max(1, familyFit.lines.length)
    : 0;
  const storyText = storyLine.replace(/\s+/g, " ").trim().toUpperCase();
  const storySize = storyText
    ? fitStackedName(storyText, HL_STORY_SIZE, HL_BODY_TRACK, typeW, 16)
    : 0;
  const storyH = storySize ? storySize * 1.12 : 0;
  const metaText = metaLine.replace(/\s+/g, " ").trim().toUpperCase();
  const metaSize = metaText
    ? fitStackedName(metaText, HL_META_SIZE, HL_BODY_TRACK, typeW, 14)
    : 0;
  const metaH = metaSize ? metaSize * 1.15 : 0;
  const sourceText = sourceCredit.replace(/\s+/g, " ").trim().toUpperCase();
  const nameTop = chevronTop + chevronH + (storyH ? 18 : 34);
  const storyTop = chevronTop + chevronH + 14;
  const givenTop = storyH ? storyTop + storyH + 10 : nameTop;
  const familyTop = givenH ? givenTop + givenH + 4 : givenTop;
  const metaTop = (familyH ? familyTop + familyH : givenTop + givenH) + (metaH ? 10 : 0);
  const bodyLines = wrapHeadlineBody(
    body,
    HL_BODY_SIZE,
    boardH > GRAPHIC_HEIGHT ? 6 : 5,
    typeW - 12,
  );
  const bodyTop =
    (metaH ? metaTop + metaH : familyH ? familyTop + familyH : givenTop + givenH) +
    (bodyLines.length ? 22 : 0);
  const bodyH = Math.max(
    headlineBodyBlock(Math.max(bodyLines.length, 3)),
    HL_BODY_SIZE * HL_BODY_LINE * 3,
  );
  const logoSize = teamOnly
    ? Math.round(Math.min(boardH * 0.72, GRAPHIC_WIDTH * 0.78))
    : trade
      ? Math.max(280, Math.round(panelW * 0.52))
      : Math.max(HL_LOGO_SIZE, Math.round(panelW * 1.16));
  const logoX = teamOnly
    ? Math.round((HL_SPLIT_X - logoSize) / 2)
    : panelX + (trade ? panelW * 0.25 : panelW / 2) - logoSize / 2;
  const logoY = Math.round((HL_CHEVRON_TOP - logoSize) / 2);
  const logoBX = trade ? panelX + panelW * 0.75 - logoSize / 2 : logoX;
  const halfW = panelW / 2;
  const baX = photoW > 0 ? photoX + HL_BA_INSET : HL_BA_INSET;

  return {
    boardW: GRAPHIC_WIDTH,
    boardH,
    splitX: photoW,
    panelLeft: panelLeft && !teamOnly,
    boardMode: mode,
    photo: { id: "photo", x: photoX, y: 0, w: photoW, h: boardH },
    panel: {
      id: "panel",
      x: panelX,
      y: 0,
      w: trade ? halfW : panelW,
      h: boardH,
    },
    panelB: {
      id: "panel-b",
      x: trade ? panelX + halfW : panelX,
      y: 0,
      w: trade ? halfW : 0,
      h: boardH,
    },
    chevron: {
      id: "kicker",
      x: chevronX,
      y: chevronTop,
      w: chevronW,
      h: chevronH,
      notch,
      rise: HL_CHEVRON_RISE,
      mirror: panelLeft && !teamOnly,
    },
    logo: { x: logoX, y: logoY, size: logoSize },
    logoB: { x: logoBX, y: logoY, size: trade ? logoSize : 0 },
    kicker: {
      id: "kicker-type",
      x: typeX,
      y: chevronTop,
      w: typeW,
      h: chevronH,
      size: kickerFit.size,
      lines: kickerFit.lines,
    },
    story: {
      id: "story",
      x: typeX,
      y: storyTop,
      w: typeW,
      h: storyH,
      size: storySize,
      text: storyText,
    },
    given: {
      id: "given",
      x: typeX,
      y: givenTop,
      w: typeW,
      h: givenH,
      size: givenSize,
      text: stackedGiven,
      lines: givenFit.lines,
    },
    family: {
      id: "family",
      x: typeX,
      y: familyTop,
      w: typeW,
      h: familyH,
      size: familySize,
      text: stackedFamily,
      lines: familyFit.lines,
    },
    meta: {
      id: "meta",
      x: typeX,
      y: metaTop,
      w: typeW,
      h: metaH,
      size: metaSize,
      text: metaText,
    },
    body: {
      id: "body",
      x: typeX,
      y: bodyTop,
      w: typeW,
      h: Math.max(bodyH, HL_BODY_SIZE * HL_BODY_LINE * 2),
      lines: bodyLines,
    },
    source: {
      id: "source",
      x: typeX,
      y: boardH - 36 - HL_SOURCE_SIZE,
      w: typeW,
      h: sourceText ? HL_SOURCE_SIZE * 1.2 : 0,
      size: HL_SOURCE_SIZE,
      text: sourceText,
    },
    ba: {
      id: "ba",
      x: baX,
      y: HL_BA_INSET,
      w: showBa ? HL_BA_SIZE : 0,
      h: showBa ? HL_BA_SIZE : 0,
    },
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
  layout: HeadlineSplitLayout,
): HeadlineBox[] => {
  const boxes: HeadlineBox[] = [];
  if (layout.ba.w > 0) {
    boxes.push(layout.ba);
  }
  boxes.push({
    id: "kicker",
    x: layout.chevron.x,
    y: layout.chevron.y,
    w: layout.chevron.w,
    h: layout.chevron.h,
  });
  if (layout.story.h > 0) {
    boxes.push(layout.story);
  }
  if (layout.given.h > 0) {
    boxes.push(layout.given);
  }
  if (layout.family.h > 0) {
    boxes.push(layout.family);
  }
  if (layout.meta.h > 0) {
    boxes.push(layout.meta);
  }
  if (layout.body.lines.length > 0) {
    boxes.push({
      id: "body",
      x: layout.body.x,
      y: layout.body.y,
      w: layout.body.w,
      h: headlineBodyBlock(layout.body.lines.length),
    });
  }
  return boxes.filter((box) => box.h > 0 && box.w > 0);
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
