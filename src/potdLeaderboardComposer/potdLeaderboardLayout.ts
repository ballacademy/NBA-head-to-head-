import {
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
} from "../standingsComposer/rankingState";

export { GRAPHIC_HEIGHT, GRAPHIC_WIDTH };

export const PLB_YELLOW = "#f5c400";
export const PLB_INK = "#050505";
/** Fits one yellow line plus stroke inside the 100-tall plate with padding. */
export const PLB_TITLE_SIZE = 54;
export const PLB_TITLE_PAD = 14;
export const PLB_TITLE_TRACK = 0.04;
export const PLB_ROW_SIZE = 42;
export const PLB_ROW_TRACK = 0.02;
export const PLB_ROW_SMALL = 0.82;
export const PLB_PAD_X = 56;
export const PLB_PAD_TOP = 36;
export const PLB_PAD_BOTTOM = 48;
export const PLB_TITLE_H = 100;
export const PLB_GAP = 28;
export const PLB_STROKE = 8;
export const PLB_LIST_INSET = 28;
/** Left-column mark only — never a row-width watermark. */
export const PLB_PIP_W = 40;
export const PLB_HEAD_W = 44;
export const PLB_HEAD_SIZE = 36;
export const PLB_PIP_SIZE = 36;
export const PLB_PIP_BAR_W = 6;
export const PLB_PIP_BAR_H = 28;
export const PLB_RANK_W = 88;
export const PLB_WINS_W = 108;
/** Wide enough for a last name like GILGEOUS-ALEXANDER on its own line. */
export const PLB_NAME_ADVANCE = 12.2;
export const PLB_HAIRLINE = "rgba(245, 196, 0, 0.22)";
export const PLB_ALT_FILL = "rgba(245, 196, 0, 0.05)";
export const PLB_POTD_FILL = "rgba(245, 196, 0, 0.16)";
export const PLB_ROW_H = 52;
export const PLB_WRAP_ROW_H = 68;
export const PLB_LIST_PAD_TOP = 18;
export const PLB_LIST_PAD_BOTTOM = 14;

export const leaderboardListInnerH = () =>
  GRAPHIC_HEIGHT -
  PLB_PAD_TOP -
  PLB_TITLE_H -
  PLB_GAP -
  PLB_PAD_BOTTOM -
  PLB_STROKE * 2 -
  PLB_LIST_PAD_TOP -
  PLB_LIST_PAD_BOTTOM;

export const leaderboardRowH = (wrap: boolean) =>
  wrap ? PLB_WRAP_ROW_H : PLB_ROW_H;

/** At most two dummy hairlines — never a 15-row empty spreadsheet. */
export const LEADERBOARD_MAX_BLANKS = 2;
export const LEADERBOARD_EMPTY_BLANKS = 2;

/** Blank hairline rows after real names. Cap at 1–2; empty board gets two. */
export const leaderboardBlankCount = (
  rows: Array<{ displayLines: string[] }>,
) => {
  const used = rows.reduce(
    (sum, row) => sum + leaderboardRowH(row.displayLines.length > 1),
    0,
  );
  const leftover = Math.max(
    0,
    Math.floor((leaderboardListInnerH() - used) / PLB_ROW_H),
  );
  if (rows.length === 0) {
    return Math.min(LEADERBOARD_MAX_BLANKS, Math.max(LEADERBOARD_EMPTY_BLANKS, leftover));
  }
  return Math.min(LEADERBOARD_MAX_BLANKS, leftover);
};
