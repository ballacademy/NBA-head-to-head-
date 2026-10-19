import { FRAME_WIDTH } from "../instagramComposer/composerLook";
import {
  GRAPHIC_ASPECT,
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  STORY_DESIGN_HEIGHT,
} from "../standingsComposer/rankingState";
import { RANKED_LINEUP_STRIP_COUNT } from "./rankedLineupsState";

export {
  GRAPHIC_ASPECT,
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  STORY_DESIGN_HEIGHT,
  RANKED_LINEUP_STRIP_COUNT,
};

export const RL_PAD_X = 10;
export const RL_STRIP_GAP = 4;
export const RL_BRAND_H = 40;
export const RL_BRAND_SIZE = 24;
export const RL_TITLE_SIZE = 38;
export const RL_TITLE_LINE = 1.08;
export const RL_TITLE_PAD_Y = 12;
export const RL_TITLE_PAD_X = 22;
export const RL_TITLE_BOX_X = 48;
export const RL_TITLE_GRADIENT: Array<[number, string]> = [
  [0, "#2dd4bf"],
  [0.28, "#67e8f9"],
  [0.72, "#e879f9"],
  [1, "#f472b6"],
];
/** Tight plate around two Montserrat Black lines + stroke + padding. */
export const RL_TITLE_BOX_H =
  FRAME_WIDTH * 2 +
  RL_TITLE_PAD_Y * 2 +
  Math.ceil(RL_TITLE_SIZE * RL_TITLE_LINE * 2);
export const RL_PILL_H = 34;
export const RL_PILL_SIZE = 18;
export const RL_PILL_GAP = 8;
export const RL_HEADLINE_H = 54;
export const RL_HEADLINE_SIZE = 44;
export const RL_HEADLINE_SUB_SIZE = 16;
export const RL_HEADER_PAD = 6;
export const RL_POS_H = 36;
export const RL_POS_SIZE = 26;
export const RL_NAME_H = 84;
export const RL_NAME_GIVEN_SIZE = 12;
export const RL_NAME_FAMILY_SIZE = 15;
export const RL_FADE_NAME_H = 76;
export const RL_NAME_LOGO = 20;
export const RL_FOOTER_PAD = 6;
export const RL_SWIPE_SIZE = 58;
export const RL_SWIPE_INSET = 28;

export type RankDisplay = "headline" | "pill" | "none";

export const rankedHeaderH = (display: RankDisplay = "pill") =>
  display === "none"
    ? RL_BRAND_H + RL_TITLE_BOX_H + RL_HEADER_PAD
    : display === "headline"
      ? RL_BRAND_H + RL_TITLE_BOX_H + RL_HEADLINE_H + RL_HEADER_PAD
      : RL_BRAND_H + RL_TITLE_BOX_H + RL_PILL_GAP + RL_PILL_H + RL_HEADER_PAD;

export const rankedFooterH = (showFade = false) =>
  (showFade ? RL_POS_H : RL_POS_H + RL_NAME_H) + RL_FOOTER_PAD;

export const RL_HEADER_H = rankedHeaderH("pill");
export const RL_FOOTER_H = rankedFooterH(false);
export const RL_STRIPS_TOP = RL_HEADER_H;
export const RL_STRIPS_BOTTOM = GRAPHIC_HEIGHT - RL_FOOTER_H;

export const RL_STRIP_W =
  (GRAPHIC_WIDTH -
    RL_PAD_X * 2 -
    RL_STRIP_GAP * (RANKED_LINEUP_STRIP_COUNT - 1)) /
  RANKED_LINEUP_STRIP_COUNT;

export const rankedStripH = (
  display: RankDisplay = "pill",
  showFade = false,
  boardH = GRAPHIC_HEIGHT,
) => boardH - rankedHeaderH(display) - rankedFooterH(showFade);

export const RL_STRIP_H = rankedStripH("pill", false);

export const rlStripX = (index: number) =>
  RL_PAD_X + (index % 5) * (RL_STRIP_W + RL_STRIP_GAP);

export const rankedStripRect = (
  index: number,
  count = RANKED_LINEUP_STRIP_COUNT,
  display: RankDisplay = "pill",
  showFade = false,
  boardH = GRAPHIC_HEIGHT,
) => {
  const cols = 5;
  const rows = Math.max(1, Math.ceil(count / cols));
  const col = index % cols;
  const row = Math.floor(index / cols);
  const header = rankedHeaderH(display);
  const footerRows = rows;
  const footer = rankedFooterH(showFade) * rows;
  const available = boardH - header - footer;
  const stripH =
    (available - RL_STRIP_GAP * (rows - 1)) / rows;
  return {
    x: RL_PAD_X + col * (RL_STRIP_W + RL_STRIP_GAP),
    y: header + row * (stripH + RL_STRIP_GAP),
    w: RL_STRIP_W,
    h: stripH,
    rows,
    footerRows,
  };
};
