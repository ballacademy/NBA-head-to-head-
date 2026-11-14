import {
  composerNameLines,
  readComposerNameStyle,
} from "../instagramComposer/composerNameStyle";
import type { ComposerLook } from "../instagramComposer/composerLook";
import { GRAPHIC_WIDTH } from "../standingsComposer/rankingState";
import {
  LEADER_GOLD,
  squareLeaderRows,
  visibleLeaderRows,
} from "../leaderboardComposer/leaderboardFill";
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
import {
  LS_HERO_FAMILY,
  LS_HERO_GIVEN,
  LS_HERO_KICKER,
  LS_HERO_STAT,
  leaderSplitBoardHeight,
  leaderSplitLayout,
} from "./leaderSplitLayout";
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
  const boardH = leaderSplitBoardHeight(Boolean(input.story), Boolean(input.square));
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
  const rows = visibleLeaderRows(
    squareLeaderRows(input.rows, Boolean(input.square)),
    true,
  );
  const layout = leaderSplitLayout(rows.length, input.mirror, boardH);
  const photo = layout.photo;
  const list = layout.list;
  const s = scale;
  await paintLeaderPhoto(
    context,
    input.photoSrc,
    input.pan,
    photo.x * s,
    photo.y * s,
    photo.w * s,
    photo.h * s,
    input.photoGrade,
  );
  const fade = context.createLinearGradient(
    0,
    (photo.y + photo.h * 0.58) * s,
    0,
    (photo.y + photo.h) * s,
  );
  fade.addColorStop(0, "rgba(6,6,8,0)");
  fade.addColorStop(0.48, "rgba(6,6,8,0.55)");
  fade.addColorStop(1, "rgba(6,6,8,0.96)");
  context.fillStyle = fade;
  context.fillRect(
    photo.x * s,
    (photo.y + photo.h * 0.58) * s,
    photo.w * s,
    photo.h * 0.42 * s,
  );
  const first = rows[0];
  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  const typeX = (photo.x + 36) * s;
  const typeMax = (photo.w - 72) * s;
  let cursor = (photo.y + photo.h - 36) * s;
  if (first?.value) {
    context.fillStyle = LEADER_GOLD;
    context.font = `900 ${LS_HERO_STAT * s}px ${POSTER_FONT}`;
    context.fillText(first.value, typeX, cursor, typeMax);
    cursor -= LS_HERO_STAT * 1.05 * s;
  }
  const lines = first
    ? composerNameLines(first.firstName, first.lastName, readComposerNameStyle())
    : { given: "", family: "" };
  if (lines.family) {
    context.fillStyle = "#fff";
    context.font = `900 ${LS_HERO_FAMILY * s}px ${POSTER_FONT}`;
    context.fillText(lines.family.toUpperCase(), typeX, cursor, typeMax);
    cursor -= LS_HERO_FAMILY * 0.92 * s;
  }
  if (lines.given) {
    context.fillStyle = "rgba(255,255,255,0.92)";
    context.font = `900 ${LS_HERO_GIVEN * s}px ${POSTER_FONT}`;
    context.fillText(lines.given.toUpperCase(), typeX, cursor, typeMax);
    cursor -= LS_HERO_GIVEN * 1.2 * s;
  }
  context.fillStyle = LEADER_GOLD;
  context.font = `900 ${LS_HERO_KICKER * s}px ${POSTER_FONT}`;
  setTracking(context, 0.18 * LS_HERO_KICKER * s);
  context.fillText(
    (input.title || "PPG LEADERS").toUpperCase(),
    typeX,
    cursor,
    typeMax,
  );
  setTracking(context, 0);

  paintLeaderCharcoalPane(context, list.x * s, list.y * s, list.w * s, list.h * s, scale);
  const plates = input.namePlates === true;
  const rowH = layout.rowH;
  if (!plates && rows.length > 0) {
    paintLeaderHairlineRows(
      context,
      list.x * s,
      layout.rows.y * s,
      list.w * s,
      layout.rows.h * s,
      rows.length,
      scale,
    );
  }
  for (let index = 0; index < rows.length; index += 1) {
    await paintListRow(
      context,
      rows[index]!,
      index + 1,
      layout.rows.x * s,
      (layout.rows.y + index * rowH) * s,
      layout.rows.w * s,
      rowH * s,
      false,
      input.showListHeadshots,
      scale,
      plates,
      true,
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
