import {
  paintCellFrame,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import { splitBalancedTitle } from "../instagramComposer/titleLayout";
import {
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  STORY_DESIGN_HEIGHT,
} from "../standingsComposer/rankingState";
import {
  LEADER_BARS_TITLE_TRACK,
  type LeaderBarsDraft,
} from "./leaderBarsState";
import {
  leaderBarsBoardRect,
  leaderBarsPhotoRect,
  leaderBarsTitleRect,
} from "./leaderBarsLayout";
import {
  maxLeaderRaw,
  squareLeaderRows,
  visibleLeaderRows,
} from "../leaderboardComposer/leaderboardFill";
import {
  paintBarRow,
  paintLeaderBa,
  paintLeaderFrame,
  paintLeaderPhoto,
  paintLeaderTitleMetalFloor,
  paintTitlePlate,
} from "../leaderboardComposer/leaderboardPaint";

export type LeaderBarsRenderInput = LeaderBarsDraft & {
  look?: ComposerLook;
  purpleFlair?: boolean;
  photoGrade?: boolean;
  story?: boolean;
  square?: boolean;
};

export const renderLeaderBarsCanvas = async (
  input: LeaderBarsRenderInput,
  scale = 2,
) => {
  const boardH = input.story ? STORY_DESIGN_HEIGHT : GRAPHIC_HEIGHT;
  const width = GRAPHIC_WIDTH * scale;
  const height = boardH * scale;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not open canvas");
  }
  await document.fonts?.ready.catch(() => undefined);
  const photoOnTop = input.photoPos !== "bottom";
  const photo = leaderBarsPhotoRect(photoOnTop, boardH);
  const title = leaderBarsTitleRect(photoOnTop, boardH);
  const board = leaderBarsBoardRect(photoOnTop, boardH);
  await paintLeaderTitleMetalFloor(
    context,
    width,
    height,
    (title.y + title.h) * scale,
    scale,
  );
  await paintLeaderPhoto(
    context,
    input.photoSrc,
    input.pan,
    photo.x * scale,
    photo.y * scale,
    photo.w * scale,
    photo.h * scale,
    input.photoGrade,
  );
  const lines = splitBalancedTitle(
    input.title,
    input.title,
    LEADER_BARS_TITLE_TRACK,
  );
  paintTitlePlate(
    context,
    lines,
    title.x * scale,
    title.y * scale,
    title.w * scale,
    title.h * scale,
    scale,
  );
  const rows = visibleLeaderRows(
    squareLeaderRows(input.rows, Boolean(input.square)),
    true,
  );
  const max = maxLeaderRaw(rows);
  const gap = 8;
  const rowH =
    rows.length > 0
      ? Math.min(64, (board.h - gap * (rows.length - 1)) / rows.length)
      : 52;
  for (let index = 0; index < rows.length; index += 1) {
    await paintBarRow(
      context,
      rows[index]!,
      index + 1,
      board.x * scale,
      (board.y + index * (rowH + gap)) * scale,
      board.w * scale,
      rowH * scale,
      max,
      input.barStyle !== "team",
      input.barStyle === "team",
      input.showBarHeadshots,
      scale,
    );
  }
  paintLeaderFrame(
    context,
    width,
    height,
    input.look,
    scale,
    input.purpleFlair,
  );
  paintCellFrame(context, 0, 0, width, height, input.look, scale);
  await paintLeaderBa(
    context,
    width,
    height,
    scale,
    input.showBa !== false,
    input.purpleFlair,
  );
  return canvas;
};
