import {
  composerNameLines,
  readComposerNameStyle,
} from "../instagramComposer/composerNameStyle";
import type { ComposerLook } from "../instagramComposer/composerLook";
import { splitBalancedTitle } from "../instagramComposer/titleLayout";
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
import { paintStuddedCharcoal } from "../standingsComposer/headerTexture";
import {
  LS_FADE,
  LS_HERO_FAMILY,
  LS_HERO_GIVEN,
  LS_HERO_STAT,
  LS_MAST_TYPE,
  leaderSplitBoardHeight,
  leaderSplitLayout,
} from "./leaderSplitLayout";
import {
  DEFAULT_LEADER_SPLIT_TITLE,
  type LeaderSplitDraft,
} from "./leaderSplitState";

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
  const plates = input.namePlates !== false;
  const layout = leaderSplitLayout(rows.length, input.mirror, boardH, plates);
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
  const fadeTop = 1 - LS_FADE;
  const fade = context.createLinearGradient(
    0,
    (photo.y + photo.h * fadeTop) * s,
    0,
    (photo.y + photo.h) * s,
  );
  fade.addColorStop(0, "rgba(6,6,8,0)");
  fade.addColorStop(0.48, "rgba(6,6,8,0.55)");
  fade.addColorStop(1, "rgba(6,6,8,0.96)");
  context.fillStyle = fade;
  context.fillRect(
    photo.x * s,
    (photo.y + photo.h * fadeTop) * s,
    photo.w * s,
    photo.h * LS_FADE * s,
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
  }

  paintLeaderCharcoalPane(context, list.x * s, list.y * s, list.w * s, list.h * s, scale);
  const mast = layout.mast;
  paintStuddedCharcoal(context, mast.x * s, mast.y * s, mast.w * s, mast.h * s, scale);
  context.strokeStyle = input.look === "black" ? "#0a0a0a" : "#fff";
  context.lineWidth = Math.max(2, 3 * s);
  context.strokeRect(
    mast.x * s + 1.5 * s,
    mast.y * s + 1.5 * s,
    mast.w * s - 3 * s,
    mast.h * s - 3 * s,
  );
  const titleLines = splitBalancedTitle(input.title, DEFAULT_LEADER_SPLIT_TITLE);
  const mastSize = titleLines.length > 1 ? LS_MAST_TYPE * s : 52 * s;
  context.font = `900 italic ${mastSize}px ${POSTER_FONT}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = LEADER_GOLD;
  setTracking(context, 0.02 * mastSize);
  const mastLineH = mastSize * 0.95;
  const mastStart =
    mast.y * s + mast.h * s / 2 - ((titleLines.length - 1) * mastLineH) / 2;
  titleLines.forEach((line, index) => {
    context.fillText(
      line,
      (mast.x + mast.w / 2) * s,
      mastStart + index * mastLineH,
      mast.w * s - 24 * s,
    );
  });
  setTracking(context, 0);

  const rowH = layout.rowH;
  const step = rowH + layout.rowGap;
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
      (layout.rows.y + index * step) * s,
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
