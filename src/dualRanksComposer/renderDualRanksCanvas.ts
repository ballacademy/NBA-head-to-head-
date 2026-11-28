import type { ComposerLook } from "../instagramComposer/composerLook";
import { GRAPHIC_WIDTH } from "../standingsComposer/rankingState";
import { LEADER_GOLD } from "../leaderboardComposer/leaderboardFill";
import {
  paintLeaderBa,
  paintLeaderCharcoalPane,
  paintLeaderFrame,
  paintLeaderHairlineRows,
  paintLeaderPhoto,
  paintListRow,
  POSTER_FONT,
  setTracking,
} from "../leaderboardComposer/leaderboardPaint";
import { dualRanksBoardHeight, dualRanksLayout } from "./dualRanksLayout";
import {
  dualExportColumns,
  type DualRanksDraft,
  type DualRanksLayout,
} from "./dualRanksState";

export type DualRanksRenderInput = DualRanksDraft & {
  look?: ComposerLook;
  purpleFlair?: boolean;
  photoGrade?: boolean;
  story?: boolean;
  square?: boolean;
};

const dualKind = (
  layout: DualRanksDraft["layout"],
  story: boolean,
  square: boolean,
): DualRanksLayout => {
  if (layout === "well") {
    return "well";
  }
  if (story || square || layout === "top") {
    return "top";
  }
  return "side";
};

export const renderDualRanksCanvas = async (
  input: DualRanksRenderInput,
  scale = 2,
) => {
  const boardH = dualRanksBoardHeight(Boolean(input.story));
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
  const cols = dualExportColumns(input, true, Boolean(input.square));
  const showLeft = !cols.hideLeft;
  const showRight = !cols.hideRight;
  const colCount = (showLeft ? 1 : 0) + (showRight ? 1 : 0);
  const rowCount = Math.max(cols.left.length, cols.right.length);
  const layout = dualRanksLayout(
    rowCount,
    dualKind(input.layout, Boolean(input.story), Boolean(input.square)),
    Math.max(1, colCount),
    boardH,
  );
  const s = scale;
  await paintLeaderPhoto(
    context,
    input.photoSrc,
    input.pan,
    layout.photo.x * s,
    layout.photo.y * s,
    layout.photo.w * s,
    layout.photo.h * s,
    input.photoGrade,
  );
  const plates = input.namePlates === true;
  const pane = layout.pane;
  if (plates) {
    paintLeaderCharcoalPane(
      context,
      pane.x * s,
      pane.y * s,
      pane.w * s,
      pane.h * s,
      scale,
    );
  } else {
    paintLeaderCharcoalPane(
      context,
      pane.x * s,
      pane.y * s,
      pane.w * s,
      pane.h * s,
      scale,
    );
    if (rowCount > 0) {
      paintLeaderHairlineRows(
        context,
        layout.rows.x * s,
        layout.rows.y * s,
        layout.rows.w * s,
        layout.rows.h * s,
        rowCount,
        scale,
      );
    }
  }
  const paintCol = async (
    header: string,
    rows: typeof cols.left,
    x: number,
  ) => {
    context.font = `900 ${18 * s}px ${POSTER_FONT}`;
    context.fillStyle = LEADER_GOLD;
    context.textAlign = "left";
    context.textBaseline = "top";
    setTracking(context, 0.14 * 18 * s);
    context.fillText(
      header.toUpperCase(),
      x * s,
      (pane.y + 24) * s,
      layout.colW * s,
    );
    setTracking(context, 0);
    const rowH = layout.rowH;
    const paintH = plates ? Math.max(36, rowH - 6) : Math.min(rowH, 52);
    for (let index = 0; index < rows.length; index += 1) {
      const y = layout.rows.y + index * rowH + (rowH - paintH) / 2;
      await paintListRow(
        context,
        rows[index]!,
        index + 1,
        x * s,
        y * s,
        layout.colW * s,
        paintH * s,
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
  let x = layout.rows.x;
  if (showLeft) {
    await paintCol(input.leftHeader, cols.left, x);
    x += layout.colW + layout.colGap;
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
