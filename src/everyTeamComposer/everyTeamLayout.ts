import {
  bannerBoardRect,
  BANNER_SHAPE,
  BANNER_VIEW,
} from "../standingsComposer/bannerLayout";
import {
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
} from "../standingsComposer/rankingState";
import { EVERY_TEAM_COLS, EVERY_TEAM_ROWS } from "./everyTeamState";

export { GRAPHIC_HEIGHT, GRAPHIC_WIDTH, bannerBoardRect, BANNER_SHAPE, BANNER_VIEW };

export const ET_GRID_PAD_X = 28;
export const ET_GRID_PAD_TOP = 10;
export const ET_GRID_PAD_BOTTOM = 22;
export const ET_CELL_GAP = 7;
export const ET_BORDER = 4;
export const ET_TITLE_SIZE = 54;
export const ET_TITLE_TRACK = 0.02;
export const ET_LOGO_FIT = 0.94;
/** Small corner badge so 1–30 do not fight the face. */
export const ET_RANK_SIZE = 15;
export const ET_RANK_BADGE_H = 26;
export const ET_RANK_BADGE_PAD_X = 8;
export const ET_RANK_BADGE_INSET = 8;
/** Ghosted cell logos. Jazz mountain is navy-on-metal — a small lift only. */
export const ET_LOGO_ALPHA = 0.34;
export const ET_JAZZ_LOGO_ALPHA = 0.5;
export const ET_JAZZ_LOGO_BRIGHTNESS = 1.2;

export const everyTeamLogoBackdrop = (teamId: string) =>
  teamId === "UTA"
    ? { alpha: ET_JAZZ_LOGO_ALPHA, brightness: ET_JAZZ_LOGO_BRIGHTNESS }
    : { alpha: ET_LOGO_ALPHA, brightness: 1 };

export interface EveryTeamGridMetrics {
  headerH: number;
  originX: number;
  originY: number;
  cell: number;
  gap: number;
  cols: number;
  rows: number;
}

export const everyTeamGrid = (
  scale = 1,
  boardH = GRAPHIC_HEIGHT,
): EveryTeamGridMetrics => {
  const { headerH } = bannerBoardRect(scale, boardH);
  const gap = ET_CELL_GAP * scale;
  const padX = ET_GRID_PAD_X * scale;
  const padTop = ET_GRID_PAD_TOP * scale;
  const padBottom = ET_GRID_PAD_BOTTOM * scale;
  const bodyTop = headerH + padTop;
  const bodyH = boardH * scale - bodyTop - padBottom;
  const bodyW = GRAPHIC_WIDTH * scale - padX * 2;
  const cell = Math.floor(
    Math.min(
      (bodyW - gap * (EVERY_TEAM_COLS - 1)) / EVERY_TEAM_COLS,
      (bodyH - gap * (EVERY_TEAM_ROWS - 1)) / EVERY_TEAM_ROWS,
    ),
  );
  const gridW = cell * EVERY_TEAM_COLS + gap * (EVERY_TEAM_COLS - 1);
  const gridH = cell * EVERY_TEAM_ROWS + gap * (EVERY_TEAM_ROWS - 1);
  return {
    headerH,
    originX: Math.round((GRAPHIC_WIDTH * scale - gridW) / 2),
    originY: Math.round(bodyTop + (bodyH - gridH) / 2),
    cell,
    gap,
    cols: EVERY_TEAM_COLS,
    rows: EVERY_TEAM_ROWS,
  };
};

export const everyTeamCellRect = (
  index: number,
  grid: EveryTeamGridMetrics,
) => {
  const col = index % grid.cols;
  const row = Math.floor(index / grid.cols);
  return {
    x: grid.originX + col * (grid.cell + grid.gap),
    y: grid.originY + row * (grid.cell + grid.gap),
    size: grid.cell,
  };
};

export const everyTeamBannerRectPath = (
  x: number,
  y: number,
  w: number,
  h: number,
) => {
  const sx = w / BANNER_VIEW.width;
  const sy = h / BANNER_VIEW.height;
  const left = x + BANNER_SHAPE.insetX * sx;
  const right = x + (BANNER_VIEW.width - BANNER_SHAPE.insetX) * sx;
  const top = y + BANNER_SHAPE.top * sy;
  const bottom = y + BANNER_SHAPE.bottom * sy;
  return { left, right, top, bottom };
};
