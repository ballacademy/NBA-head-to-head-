import { GRAPHIC_HEIGHT, GRAPHIC_WIDTH } from "../standingsComposer/rankingState";
import { TOTW_STATS_FIELDS } from "./totwStatsExport";

export { GRAPHIC_HEIGHT, GRAPHIC_WIDTH };

export const TWS_PAD_X = 28;
export const TWS_PAD_TOP = 22;
export const TWS_BRAND_H = 36;
export const TWS_TITLE_H = 48;
export const TWS_WEEK_H = 32;
export const TWS_NOTE_H = 20;
export const TWS_SECTION_H = 38;
export const TWS_HEAD_H = 32;
export const TWS_FOOTER_H = 24;
export const TWS_PLAYER_W = 236;
export const TWS_BRAND_SIZE = 18;
export const TWS_TITLE_SIZE = 36;
export const TWS_WEEK_SIZE = 16;
export const TWS_SECTION_SIZE = 22;
export const TWS_HEAD_SIZE = 11;
export const TWS_VALUE_SIZE = 16;
export const TWS_NAME_SIZE = 15;
export const TWS_GIVEN_SIZE = 10;
export const TWS_SLOT_SIZE = 10;
export const TWS_NOTE_SIZE = 11;
export const TWS_BA_SIZE = 64;
export const TWS_BA_INSET = 28;
export const TWS_TITLE_TRACK = 0.04;

export const TWS_STAT_COUNT = TOTW_STATS_FIELDS.length;

export const twsTableWidth = GRAPHIC_WIDTH - TWS_PAD_X * 2;

export const twsStatColW = (twsTableWidth - TWS_PLAYER_W) / TWS_STAT_COUNT;

export const twsHeaderH = (showBrand: boolean) =>
  TWS_PAD_TOP +
  (showBrand ? TWS_BRAND_H : 8) +
  TWS_TITLE_H +
  TWS_WEEK_H +
  TWS_NOTE_H;

export const twsBodyTop = (showBrand: boolean) => twsHeaderH(showBrand);

export const twsAvailableBody = (showBrand: boolean, sectionCount: number) =>
  GRAPHIC_HEIGHT -
  twsBodyTop(showBrand) -
  TWS_FOOTER_H -
  sectionCount * (TWS_SECTION_H + TWS_HEAD_H);

export const twsRowH = (
  rowCount: number,
  showBrand: boolean,
  sectionCount: number,
) => {
  const available = twsAvailableBody(showBrand, Math.max(1, sectionCount));
  const count = Math.max(1, rowCount);
  return Math.max(52, Math.min(108, available / count));
};
