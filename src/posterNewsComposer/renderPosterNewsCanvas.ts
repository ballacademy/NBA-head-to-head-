import type { ComposerLook } from "../instagramComposer/composerLook";
import { paintLetterGradePlate } from "../instagramComposer/paintLetterGrade";
import {
  DEFAULT_LETTER_GRADE,
  parseLetterGrade,
} from "../lib/letterGrade";
import {
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  STORY_DESIGN_HEIGHT,
} from "../standingsComposer/rankingState";
import { LEADER_GOLD } from "../leaderboardComposer/leaderboardFill";
import {
  paintLeaderBa,
  paintLeaderFrame,
  paintLeaderPhoto,
  POSTER_FONT,
  setTracking,
} from "../leaderboardComposer/leaderboardPaint";
import type { PosterNewsDraft } from "./posterNewsState";

export type PosterNewsRenderInput = PosterNewsDraft & {
  look?: ComposerLook;
  purpleFlair?: boolean;
  photoGrade?: boolean;
  story?: boolean;
};

export const renderPosterNewsCanvas = async (
  input: PosterNewsRenderInput,
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
  context.fillStyle = "#0b0b0b";
  context.fillRect(0, 0, width, height);
  await paintLeaderPhoto(
    context,
    input.photoSrc,
    input.pan,
    0,
    0,
    width,
    height,
    input.photoGrade,
  );
  const fade = context.createLinearGradient(0, height * 0.42, 0, height);
  fade.addColorStop(0, "rgba(6,6,8,0)");
  fade.addColorStop(0.32, "rgba(6,6,8,0.4)");
  fade.addColorStop(0.68, "rgba(6,6,8,0.82)");
  fade.addColorStop(1, "rgba(6,6,8,0.98)");
  context.fillStyle = fade;
  context.fillRect(0, height * 0.42, width, height * 0.58);
  const s = scale;
  let y = height - 48 * s;
  const lines = [input.line3, input.line2, input.line1]
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  context.fillStyle = "#fff";
  context.font = `900 ${48 * s}px ${POSTER_FONT}`;
  for (const line of lines) {
    context.fillText(line.toUpperCase(), 48 * s, y, width - 96 * s);
    y -= 56 * s;
  }
  if (input.nameMode !== "even") {
    if (input.family.trim()) {
      context.font = `900 ${92 * s}px ${POSTER_FONT}`;
      context.fillText(input.family.toUpperCase(), 48 * s, y, width - 96 * s);
      y -= 86 * s;
    }
    if (input.given.trim()) {
      context.font = `900 ${36 * s}px ${POSTER_FONT}`;
      setTracking(context, 0.08 * 36 * s);
      context.fillText(input.given.toUpperCase(), 48 * s, y, width - 96 * s);
      setTracking(context, 0);
      y -= 48 * s;
    }
  }
  y -= 12 * s;
  const kicker = (input.kicker || "BREAKING").toUpperCase();
  context.font = `900 ${22 * s}px ${POSTER_FONT}`;
  setTracking(context, 0.16 * 22 * s);
  const kw = Math.max(140 * s, context.measureText(kicker).width + 32 * s);
  context.strokeStyle = LEADER_GOLD;
  context.lineWidth = 2 * s;
  context.strokeRect(48 * s, y - 32 * s, kw, 42 * s);
  context.fillStyle = LEADER_GOLD;
  context.textBaseline = "middle";
  context.fillText(kicker, 64 * s, y - 11 * s);
  setTracking(context, 0);
  if (input.showDatePip && input.datePip.trim()) {
    context.fillStyle = "rgba(255,255,255,0.78)";
    context.font = `900 ${16 * s}px ${POSTER_FONT}`;
    context.fillText(input.datePip.toUpperCase(), 48 * s + kw + 16 * s, y - 11 * s);
  }
  if (input.source.trim()) {
    context.fillStyle = "rgba(255,255,255,0.7)";
    context.font = `800 ${16 * s}px ${POSTER_FONT}`;
    context.textBaseline = "alphabetic";
    context.fillText(input.source.toUpperCase(), 48 * s, height - 20 * s);
  }
  if (input.showLetterGrade) {
    paintLetterGradePlate(
      context,
      { x: GRAPHIC_WIDTH - 28 - 118, y: boardH - 108 - 88, w: 118, h: 88 },
      parseLetterGrade(input.letterGrade ?? DEFAULT_LETTER_GRADE),
      input.letterGradeReason ?? "",
      s,
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
