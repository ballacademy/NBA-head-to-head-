import {
  GRAPHIC_ASPECT,
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
} from "../standingsComposer/rankingState";
import { playInSeeds, type PlayInSize } from "./playInState";

export { GRAPHIC_ASPECT, GRAPHIC_HEIGHT, GRAPHIC_WIDTH };

export const PI_TITLE_SIZE = 54;
export const PI_TITLE_Y = 78;
export const PI_BA_SIZE = 72;
export const PI_BA_INSET = 36;
export const PI_BOARD_TOP = 132;
export const PI_BOARD_BOTTOM = 36;
export const PI_PAD_X = 36;
export const PI_COL_GAP = 48;
export const PI_CONF_SIZE = 22;
export const PI_CONF_H = 32;
export const PI_MATCH_LABEL_SIZE = 22;
export const PI_MATCH_LABEL_H = 30;
export const PI_SEED_SIZE = 28;
export const PI_BRACKET_W = 42;
export const PI_SLOT_GAP = 16;
export const PI_MATCH_GAP = 22;
export const PI_LOGO_FIT = 0.9;
export const PI_BYE_LABEL = "BYE";

export interface PlayInPair {
  label: string;
  seeds: readonly [number, number];
}

export interface PlayInMatchups {
  bye: number | null;
  pairs: PlayInPair[];
}

export const playInMatchups = (size: PlayInSize): PlayInMatchups => ({
  bye: size === 10 ? 6 : null,
  pairs: [
    { label: "7v8", seeds: [7, 8] },
    { label: "9v10", seeds: [9, 10] },
  ],
});

export const seedSlotIndex = (size: PlayInSize, seed: number) =>
  playInSeeds(size).indexOf(seed);

export interface PlayInSlotRect {
  seed: number;
  index: number;
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
  /** Bracket spine on the inside edge of the pair. */
  line: { x: number; y: number; w: number; h: number; side: "east" | "west" };
}

export interface PlayInColRect {
  conference: "east" | "west";
  label: string;
  x: number;
  y: number;
  w: number;
  bye: PlayInSlotRect | null;
  matches: PlayInMatchRect[];
}

export const playInColWidth = () =>
  (GRAPHIC_WIDTH - PI_PAD_X * 2 - PI_COL_GAP) / 2;

export const playInBoardCols = (size: PlayInSize): PlayInColRect[] => {
  const matchups = playInMatchups(size);
  const colW = playInColWidth();
  const boardY = PI_BOARD_TOP;
  const boardH = GRAPHIC_HEIGHT - PI_BOARD_TOP - PI_BOARD_BOTTOM;
  const byeWeight = matchups.bye == null ? 0 : 0.72;
  const matchWeight = 1;
  const weights = byeWeight + matchups.pairs.length * matchWeight;
  const available =
    boardH -
    PI_CONF_H -
    (matchups.bye == null ? 0 : PI_MATCH_GAP) -
    matchups.pairs.length * (PI_MATCH_LABEL_H + PI_MATCH_GAP);
  const unit = available / weights;

  const buildCol = (
    conference: "east" | "west",
    label: string,
    x: number,
  ): PlayInColRect => {
    let cursor = boardY + PI_CONF_H;
    let bye: PlayInSlotRect | null = null;
    if (matchups.bye != null) {
      const h = unit * byeWeight;
      bye = {
        seed: matchups.bye,
        index: seedSlotIndex(size, matchups.bye),
        x,
        y: cursor,
        w: colW,
        h,
      };
      cursor += h + PI_MATCH_GAP;
    }
    const matches = matchups.pairs.map((pair) => {
      cursor += PI_MATCH_LABEL_H;
      const blockH = unit * matchWeight;
      const slotH = (blockH - PI_SLOT_GAP) / 2;
      const labelY = cursor - PI_MATCH_LABEL_H / 2;
      const top: PlayInSlotRect = {
        seed: pair.seeds[0],
        index: seedSlotIndex(size, pair.seeds[0]),
        x,
        y: cursor,
        w: colW - PI_BRACKET_W,
        h: slotH,
      };
      const bottom: PlayInSlotRect = {
        seed: pair.seeds[1],
        index: seedSlotIndex(size, pair.seeds[1]),
        x,
        y: cursor + slotH + PI_SLOT_GAP,
        w: colW - PI_BRACKET_W,
        h: slotH,
      };
      if (conference === "west") {
        top.x = x + PI_BRACKET_W;
        bottom.x = x + PI_BRACKET_W;
      }
      const lineX = conference === "east" ? x + top.w : x;
      const line = {
        x: lineX,
        y: top.y + top.h * 0.18,
        w: PI_BRACKET_W,
        h: bottom.y + bottom.h * 0.82 - (top.y + top.h * 0.18),
        side: conference,
      };
      cursor += blockH + PI_MATCH_GAP;
      return {
        label: pair.label,
        labelX: x + colW / 2,
        labelY,
        slots: [top, bottom] as [PlayInSlotRect, PlayInSlotRect],
        line,
      };
    });
    return {
      conference,
      label,
      x,
      y: boardY,
      w: colW,
      bye,
      matches,
    };
  };

  return [
    buildCol("east", "EAST", PI_PAD_X),
    buildCol("west", "WEST", PI_PAD_X + colW + PI_COL_GAP),
  ];
};
