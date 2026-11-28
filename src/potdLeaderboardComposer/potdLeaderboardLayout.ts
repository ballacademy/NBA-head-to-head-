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
export const PLB_META_SIZE = 32;
export const PLB_ROW_TRACK = 0.02;
export const PLB_ROW_SMALL = 0.82;
export const PLB_PAD_X = 56;
export const PLB_PAD_TOP = 36;
export const PLB_PAD_BOTTOM = 48;
export const PLB_TITLE_H = 100;
export const PLB_GAP = 28;
export const PLB_STROKE = 8;
export const PLB_LIST_INSET = 28;
/** Marks sit after the name — never a row-width watermark. */
export const PLB_PIP_W = 64;
export const PLB_HEAD_W = 70;
export const PLB_HEAD_SIZE = 62;
export const PLB_PIP_SIZE = 56;
export const PLB_PIP_BAR_W = 6;
export const PLB_PIP_BAR_H = 44;
export const PLB_COL_GAP = 8;
/** Wide enough for T11. / (12) inside the row at PLB_META_SIZE. */
export const PLB_RANK_W = 118;
export const PLB_WINS_W = 118;
/** Wide enough for a last name like GILGEOUS-ALEXANDER on its own line. */
export const PLB_NAME_ADVANCE = 12.2;
export const PLB_HAIRLINE = "rgba(245, 196, 0, 0.22)";
export const PLB_ALT_FILL = "rgba(245, 196, 0, 0.05)";
/** Gold ring on today’s mug. 4 native → ~2 Fit px on a 29px head. */
export const PLB_HEAD_RING = 4;
export const PLB_ROW_H = 78;
export const PLB_WRAP_ROW_H = 102;
export const PLB_LIST_PAD_TOP = 18;
export const PLB_LIST_PAD_BOTTOM = 14;
/** Compact Cover-style swipe; sits in the bottom-right pad, yellow on black. */
export const PLB_SWIPE_SIZE = 56;
export const PLB_SWIPE_INSET = 18;
export const PLB_SWIPE_LABEL = 14;
export const PLB_SWIPE_CHEV = 16;
export const PLB_SWIPE_STROKE = 3.4;

export const leaderboardListInnerH = (boardH = GRAPHIC_HEIGHT) =>
  boardH -
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

/** Single-line rows that fill the 4:5 list. Do not shrink type to cram more. */
export const LEADERBOARD_PAGE_SINGLE_CAPACITY = Math.floor(
  leaderboardListInnerH(GRAPHIC_HEIGHT) / PLB_ROW_H,
);

/** Pack named rows into 4:5 pages. Story / 1:1 inherit this split. */
export const packLeaderboardRowPages = <
  T extends { displayLines: string[] },
>(
  rows: T[],
): T[][] => {
  const inner = leaderboardListInnerH(GRAPHIC_HEIGHT);
  const pages: T[][] = [];
  let current: T[] = [];
  let used = 0;
  for (const row of rows) {
    const h = leaderboardRowH(row.displayLines.length > 1);
    if (current.length > 0 && used + h > inner) {
      pages.push(current);
      current = [];
      used = 0;
    }
    current.push(row);
    used += h;
  }
  if (current.length) {
    pages.push(current);
  }
  return pages;
};

/** Blank hairline rows after real names. Cap at 1–2; empty board gets two. */
export const leaderboardBlankCount = (
  rows: Array<{ displayLines: string[] }>,
  boardH = GRAPHIC_HEIGHT,
) => {
  const used = rows.reduce(
    (sum, row) => sum + leaderboardRowH(row.displayLines.length > 1),
    0,
  );
  const leftover = Math.max(
    0,
    Math.floor((leaderboardListInnerH(boardH) - used) / PLB_ROW_H),
  );
  if (rows.length === 0) {
    return Math.min(LEADERBOARD_MAX_BLANKS, Math.max(LEADERBOARD_EMPTY_BLANKS, leftover));
  }
  return Math.min(LEADERBOARD_MAX_BLANKS, leftover);
};
