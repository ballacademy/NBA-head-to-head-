import { formatComposerName } from "../instagramComposer/composerNameStyle";
import type { ComposerLook } from "../instagramComposer/composerLook";
import {
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  STORY_DESIGN_HEIGHT,
} from "../standingsComposer/rankingState";
import { LEADER_GOLD, squareLeaderRows, visibleLeaderRows } from "../leaderboardComposer/leaderboardFill";
import {
  paintLeaderBa,
  paintLeaderFrame,
  paintLeaderMetal,
  paintLeaderPhoto,
  paintListRow,
  POSTER_FONT,
  setTracking,
} from "../leaderboardComposer/leaderboardPaint";
import type { LeaderSplitDraft } from "./leaderSplitState";

export type LeaderSplitRenderInput = LeaderSplitDraft & {
  look?: ComposerLook;
  purpleFlair?: boolean;
  photoGrade?: boolean;
  story?: boolean;
  square?: boolean;
};

export const renderLeaderSplitCanvas = async (
  input: LeaderSplitRenderInput,
  scale = 2,
) => {
  const restack = Boolean(input.story || input.square);
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
  await paintLeaderMetal(context, width, height, scale);
  const listW = restack ? GRAPHIC_WIDTH : Math.round(GRAPHIC_WIDTH * 0.42);
  const photoW = restack ? GRAPHIC_WIDTH : GRAPHIC_WIDTH - listW;
  const photoH = restack ? Math.round(boardH * 0.52) : boardH;
  const listH = restack ? boardH - photoH : boardH;
  const photoX = restack || input.mirror ? 0 : listW;
  const photoY = 0;
  const listX = restack || !input.mirror ? 0 : photoW;
  const listY = restack ? photoH : 0;
  await paintLeaderPhoto(
    context,
    input.photoSrc,
    input.pan,
    photoX * scale,
    photoY * scale,
    photoW * scale,
    photoH * scale,
    input.photoGrade,
  );
  const fade = context.createLinearGradient(
    0,
    (photoY + photoH * 0.54) * scale,
    0,
    (photoY + photoH) * scale,
  );
  fade.addColorStop(0, "rgba(6,6,8,0)");
  fade.addColorStop(0.48, "rgba(6,6,8,0.55)");
  fade.addColorStop(1, "rgba(6,6,8,0.96)");
  context.fillStyle = fade;
  context.fillRect(
    photoX * scale,
    (photoY + photoH * 0.54) * scale,
    photoW * scale,
    photoH * 0.46 * scale,
  );
  const rows = visibleLeaderRows(
    squareLeaderRows(input.rows, Boolean(input.square)),
    true,
  );
  const first = rows[0];
  const s = scale;
  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  context.fillStyle = LEADER_GOLD;
  context.font = `900 ${22 * s}px ${POSTER_FONT}`;
  setTracking(context, 0.18 * 22 * s);
  context.fillText(
    (input.title || "PPG LEADERS").toUpperCase(),
    (photoX + 36) * s,
    (photoY + photoH - 160) * s,
    (photoW - 72) * s,
  );
  setTracking(context, 0);
  if (first) {
    const last = formatComposerName(first.firstName, first.lastName, "last");
    context.fillStyle = "#fff";
    context.font = `900 ${72 * s}px ${POSTER_FONT}`;
    context.fillText(last.toUpperCase(), (photoX + 36) * s, (photoY + photoH - 88) * s, (photoW - 72) * s);
    context.fillStyle = LEADER_GOLD;
    context.font = `900 ${54 * s}px ${POSTER_FONT}`;
    context.fillText(first.value, (photoX + 36) * s, (photoY + photoH - 28) * s, (photoW - 72) * s);
  }
  const pad = 28;
  const usableH = listH - pad * 2;
  const rowH = rows.length ? Math.min(56, usableH / rows.length) : 48;
  for (let index = 0; index < rows.length; index += 1) {
    await paintListRow(
      context,
      rows[index]!,
      index + 1,
      (listX + pad) * s,
      (listY + pad + index * rowH) * s,
      (listW - pad * 2) * s,
      rowH * s,
      false,
      input.showListHeadshots,
      scale,
    );
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
