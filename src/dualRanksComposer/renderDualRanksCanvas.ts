import type { ComposerLook } from "../instagramComposer/composerLook";
import {
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  STORY_DESIGN_HEIGHT,
} from "../standingsComposer/rankingState";
import { LEADER_GOLD } from "../leaderboardComposer/leaderboardFill";
import {
  packedLeaderRowH,
  paintLeaderBa,
  paintLeaderCharcoalPane,
  paintLeaderFrame,
  paintLeaderHairlineRows,
  paintLeaderPhoto,
  paintListRow,
  POSTER_FONT,
  setTracking,
} from "../leaderboardComposer/leaderboardPaint";
import { dualExportColumns, type DualRanksDraft } from "./dualRanksState";

export type DualRanksRenderInput = DualRanksDraft & {
  look?: ComposerLook;
  purpleFlair?: boolean;
  photoGrade?: boolean;
  story?: boolean;
  square?: boolean;
};

export const renderDualRanksCanvas = async (
  input: DualRanksRenderInput,
  scale = 2,
) => {
  const restack = Boolean(input.story || input.square || input.layout !== "side");
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
  const photoW = restack ? GRAPHIC_WIDTH : Math.round(GRAPHIC_WIDTH * 0.45);
  const photoH = restack
    ? input.layout === "well"
      ? Math.round(boardH * 0.58)
      : Math.round(boardH * 0.46)
    : boardH;
  await paintLeaderPhoto(
    context,
    input.photoSrc,
    input.pan,
    0,
    0,
    photoW * scale,
    photoH * scale,
    input.photoGrade,
  );
  const cols = dualExportColumns(input, true, Boolean(input.square));
  const showLeft = !cols.hideLeft;
  const showRight = !cols.hideRight;
  const colCount = (showLeft ? 1 : 0) + (showRight ? 1 : 0);
  const boardX = restack ? 24 : photoW + 16;
  const boardY = restack ? photoH + 16 : 28;
  const boardW = restack ? GRAPHIC_WIDTH - 48 : GRAPHIC_WIDTH - photoW - 40;
  const boardHArea = restack ? boardH - photoH - 36 : boardH - 56;
  const colW = colCount > 1 ? (boardW - 16) / 2 : boardW;
  const paneX = restack ? 0 : photoW;
  const paneY = restack && input.layout === "well" ? Math.round(boardH * 0.58) : restack ? photoH : 0;
  const paneW = restack ? GRAPHIC_WIDTH : GRAPHIC_WIDTH - photoW;
  const paneH = restack ? boardH - paneY : boardH;
  const plates = input.namePlates !== false;
  if (plates) {
    paintLeaderCharcoalPane(
      context,
      paneX * scale,
      paneY * scale,
      paneW * scale,
      paneH * scale,
      scale,
    );
  } else {
    paintLeaderHairlineRows(
      context,
      paneX * scale,
      paneY * scale,
      paneW * scale,
      paneH * scale,
      Math.max(cols.left.length, cols.right.length, 8),
      scale,
    );
  }
  const paintCol = async (
    header: string,
    rows: typeof cols.left,
    x: number,
  ) => {
    const s = scale;
    context.font = `900 ${18 * s}px ${POSTER_FONT}`;
    context.fillStyle = LEADER_GOLD;
    context.textAlign = "left";
    context.textBaseline = "top";
    setTracking(context, 0.14 * 18 * s);
    context.fillText(header.toUpperCase(), x * s, boardY * s, colW * s);
    setTracking(context, 0);
    const gap = plates ? 6 : 0;
    const rowH = rows.length
      ? plates
        ? packedLeaderRowH(boardHArea - 32, rows.length, gap)
        : Math.min(48, (boardHArea - 32) / rows.length)
      : 40;
    for (let index = 0; index < rows.length; index += 1) {
      await paintListRow(
        context,
        rows[index]!,
        index + 1,
        x * s,
        (boardY + 28 + index * (rowH + gap)) * s,
        colW * s,
        rowH * s,
        Boolean(
          input.featuredPlayerId &&
            rows[index]!.playerId === input.featuredPlayerId,
        ),
        false,
        scale,
        plates,
      );
    }
  };
  let x = boardX;
  if (showLeft) {
    await paintCol(input.leftHeader, cols.left, x);
    x += colW + 16;
  }
  if (showRight) {
    await paintCol(input.rightHeader, cols.right, x);
  }
  paintLeaderFrame(context, width, height, input.look, scale, input.purpleFlair);
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
