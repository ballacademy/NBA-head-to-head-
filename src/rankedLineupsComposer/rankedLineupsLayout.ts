import {
  GRAPHIC_ASPECT,
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
} from "../standingsComposer/rankingState";
import { RANKED_LINEUP_STRIP_COUNT } from "./rankedLineupsState";

export {
  GRAPHIC_ASPECT,
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  RANKED_LINEUP_STRIP_COUNT,
};

export const RL_PAD_X = 10;
export const RL_STRIP_GAP = 4;
export const RL_BRAND_H = 40;
export const RL_BRAND_SIZE = 24;
export const RL_TITLE_SIZE = 38;
export const RL_TITLE_GRADIENT: Array<[number, string]> = [
  [0, "#2dd4bf"],
  [0.28, "#67e8f9"],
  [0.72, "#e879f9"],
  [1, "#f472b6"],
];
export const RL_TITLE_BLOCK_H = 62;
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
export const RL_FADE_NAME_H = 108;
export const RL_NAME_LOGO = 28;
export const RL_FOOTER_PAD = 6;

export type RankDisplay = "headline" | "pill";

export const rankedHeaderH = (display: RankDisplay = "headline") =>
  display === "pill"
    ? RL_BRAND_H + RL_TITLE_BLOCK_H + RL_PILL_GAP + RL_PILL_H + RL_HEADER_PAD
    : RL_BRAND_H + RL_TITLE_BLOCK_H + RL_HEADLINE_H + RL_HEADER_PAD;

export const rankedFooterH = (showFade = false) =>
  (showFade ? RL_POS_H : RL_POS_H + RL_NAME_H) + RL_FOOTER_PAD;

export const RL_HEADER_H = rankedHeaderH("headline");
export const RL_FOOTER_H = rankedFooterH(false);
export const RL_STRIPS_TOP = RL_HEADER_H;
export const RL_STRIPS_BOTTOM = GRAPHIC_HEIGHT - RL_FOOTER_H;

export const RL_STRIP_W =
  (GRAPHIC_WIDTH -
    RL_PAD_X * 2 -
    RL_STRIP_GAP * (RANKED_LINEUP_STRIP_COUNT - 1)) /
  RANKED_LINEUP_STRIP_COUNT;

export const rankedStripH = (
  display: RankDisplay = "headline",
  showFade = false,
) => GRAPHIC_HEIGHT - rankedHeaderH(display) - rankedFooterH(showFade);

export const RL_STRIP_H = rankedStripH("headline", false);

export const rlStripX = (index: number) =>
  RL_PAD_X + index * (RL_STRIP_W + RL_STRIP_GAP);
