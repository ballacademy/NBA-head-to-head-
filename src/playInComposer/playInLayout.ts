import {
  GRAPHIC_ASPECT,
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
} from "../standingsComposer/rankingState";
import { playInSeeds, type PlayInSize } from "./playInState";

export { GRAPHIC_ASPECT, GRAPHIC_HEIGHT, GRAPHIC_WIDTH };

export const PI_TITLE_SIZE = 64;
export const PI_TITLE_Y = 54;
export const PI_KICKER_SIZE = 18;
export const PI_KICKER_Y = 100;
export const PI_KICKER = "7v8 FOR THE 7 SEED   ·   9v10 THEN THE 8-SEED GAME";
export const PI_LEGEND =
  "LOSER OF 7v8 PLAYS THE 9v10 WINNER  ·  8-SEED GAME";
export const PI_LEGEND_SIZE = 16;
export const PI_LEGEND_Y = 1466;
export const PI_BA_SIZE = 72;
export const PI_BA_INSET = 28;
export const PI_BOARD_TOP = 126;
export const PI_BOARD_BOTTOM = 52;
export const PI_PAD_X = 26;
export const PI_COL_GAP = 30;
export const PI_CONF_SIZE = 22;
export const PI_CONF_H = 34;
export const PI_PATH_W = 176;
export const PI_SEED_BADGE = 70;
export const PI_SEED_SIZE = 38;
export const PI_SLOT_GAP = 12;
export const PI_EIGHT_GAP = 96;
export const PI_BYE_H = 100;
export const PI_BYE_GAP = 14;
export const PI_LOGO_FIT = 0.94;
export const PI_STROKE = 4;
export const PI_PLATE_H = 58;
export const PI_PLATE_PAD = 10;
export const PI_MATCH_LABEL_SIZE = 16;
export const PI_BYE_LABEL = "BYE";
export const PI_ABBR_SIZE = 20;
export const PI_EIGHT_LABEL = "8-SEED GAME";

export interface PlayInPair {
  label: string;
  seeds: readonly [number, number];
  winnerLabel: string;
}

export interface PlayInMatchups {
  bye: number | null;
  pairs: PlayInPair[];
  eightLabel: string;
}

export const playInMatchups = (size: PlayInSize): PlayInMatchups => ({
  bye: size === 10 ? 6 : null,
  pairs: [
    { label: "7v8", seeds: [7, 8], winnerLabel: "7 SEED" },
    { label: "9v10", seeds: [9, 10], winnerLabel: "9v10" },
  ],
  eightLabel: PI_EIGHT_LABEL,
});

export const seedSlotIndex = (size: PlayInSize, seed: number) =>
  playInSeeds(size).indexOf(seed);

export interface PlayInBar {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PlayInSlotRect {
  seed: number;
  index: number;
  x: number;
  y: number;
  w: number;
  h: number;
  badge: { x: number; y: number; w: number; h: number };
}

export interface PlayInPlateRect {
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PlayInMatchRect {
  label: string;
  labelX: number;
  labelY: number;
  slots: [PlayInSlotRect, PlayInSlotRect];
  winner: PlayInPlateRect;
  lines: PlayInBar[];
}

export interface PlayInColRect {
  conference: "east" | "west";
  label: string;
  x: number;
  y: number;
  w: number;
  bye: PlayInSlotRect | null;
  matches: PlayInMatchRect[];
  eightSeed: PlayInPlateRect;
  eightLines: PlayInBar[];
}

export const playInColWidth = () =>
  (GRAPHIC_WIDTH - PI_PAD_X * 2 - PI_COL_GAP) / 2;

const barH = (x1: number, x2: number, y: number): PlayInBar => {
  const left = Math.min(x1, x2);
  return { x: left, y: y - PI_STROKE / 2, w: Math.abs(x2 - x1), h: PI_STROKE };
};

const barV = (x: number, y1: number, y2: number): PlayInBar => {
  const top = Math.min(y1, y2);
  return { x: x - PI_STROKE / 2, y: top, w: PI_STROKE, h: Math.abs(y2 - y1) };
};

const makeSlot = (
  seed: number,
  index: number,
  x: number,
  y: number,
  w: number,
  h: number,
): PlayInSlotRect => ({
  seed,
  index,
  x,
  y,
  w,
  h,
  badge: {
    x: x + 10,
    y: y + 10,
    w: PI_SEED_BADGE,
    h: PI_SEED_BADGE,
  },
});

export const playInBoardCols = (size: PlayInSize): PlayInColRect[] => {
  const matchups = playInMatchups(size);
  const colW = playInColWidth();
  const boardY = PI_BOARD_TOP;
  const boardH = GRAPHIC_HEIGHT - PI_BOARD_TOP - PI_BOARD_BOTTOM;
  const byeBlock = matchups.bye == null ? 0 : PI_BYE_H + PI_BYE_GAP;
  const slotH =
    (boardH -
      PI_CONF_H -
      byeBlock -
      PI_SLOT_GAP * 2 -
      PI_EIGHT_GAP) /
    4;
  const slotW = colW - PI_PATH_W;

  const buildCol = (
    conference: "east" | "west",
    label: string,
    x: number,
  ): PlayInColRect => {
    const slotX = conference === "east" ? x : x + PI_PATH_W;
    const pathX = conference === "east" ? x + slotW : x;
    const plateW = PI_PATH_W - PI_PLATE_PAD * 2;
    const plateX = pathX + PI_PLATE_PAD;
    const joinX =
      conference === "east" ? slotX + slotW + 16 : slotX - 16;
    let cursor = boardY + PI_CONF_H;
    let bye: PlayInSlotRect | null = null;
    if (matchups.bye != null) {
      bye = makeSlot(
        matchups.bye,
        seedSlotIndex(size, matchups.bye),
        slotX,
        cursor,
        slotW,
        PI_BYE_H,
      );
      cursor += PI_BYE_H + PI_BYE_GAP;
    }

    const matches: PlayInMatchRect[] = [];
    matchups.pairs.forEach((pair, pairIndex) => {
      if (pairIndex === 1) {
        cursor += PI_EIGHT_GAP;
      }
      const top = makeSlot(
        pair.seeds[0],
        seedSlotIndex(size, pair.seeds[0]),
        slotX,
        cursor,
        slotW,
        slotH,
      );
      const bottom = makeSlot(
        pair.seeds[1],
        seedSlotIndex(size, pair.seeds[1]),
        slotX,
        cursor + slotH + PI_SLOT_GAP,
        slotW,
        slotH,
      );
      const topCy = top.y + top.h / 2;
      const botCy = bottom.y + bottom.h / 2;
      const midY = (topCy + botCy) / 2;
      const winner: PlayInPlateRect = {
        label: pair.winnerLabel,
        x: plateX,
        y: midY - PI_PLATE_H / 2,
        w: plateW,
        h: PI_PLATE_H,
      };
      const slotEdge = conference === "east" ? slotX + slotW : slotX;
      const plateEdge =
        conference === "east" ? winner.x : winner.x + winner.w;
      const lines: PlayInBar[] = [
        barH(slotEdge, joinX, topCy),
        barH(slotEdge, joinX, botCy),
        barV(joinX, topCy, botCy),
        barH(joinX, plateEdge, midY),
      ];
      matches.push({
        label: pair.label,
        labelX: winner.x + winner.w / 2,
        labelY: winner.y - 13,
        slots: [top, bottom],
        winner,
        lines,
      });
      cursor += slotH * 2 + PI_SLOT_GAP;
    });

    const first = matches[0]!;
    const second = matches[1]!;
    const eightY =
      first.slots[1]!.y +
      first.slots[1]!.h +
      (PI_EIGHT_GAP - PI_PLATE_H) / 2;
    const eightSeed: PlayInPlateRect = {
      label: matchups.eightLabel,
      x: plateX,
      y: eightY,
      w: plateW,
      h: PI_PLATE_H,
    };
    const eightCx = eightSeed.x + eightSeed.w / 2;
    const eightLines: PlayInBar[] = [
      barV(
        eightCx,
        first.winner.y + first.winner.h,
        eightSeed.y,
      ),
      barV(
        eightCx,
        eightSeed.y + eightSeed.h,
        second.winner.y,
      ),
    ];

    return {
      conference,
      label,
      x,
      y: boardY,
      w: colW,
      bye,
      matches,
      eightSeed,
      eightLines,
    };
  };

  return [
    buildCol("east", "EAST", PI_PAD_X),
    buildCol("west", "WEST", PI_PAD_X + colW + PI_COL_GAP),
  ];
};
