import {
  paintCellFrame,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import { readComposerNameStyle } from "../instagramComposer/composerNameStyle";
import { drawPlayerNameFade } from "../instagramComposer/drawPlayerNameFade";
import { splitBalancedTitle } from "../instagramComposer/titleLayout";
import {
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  STORY_DESIGN_HEIGHT,
} from "../standingsComposer/rankingState";
import { getTeam } from "../standingsComposer/teams";
import {
  LEADER_BARS_TITLE_TRACK,
  type LeaderBarsDraft,
} from "./leaderBarsState";
import {
  LB_GAP,
  LB_HERO_FAMILY,
  LB_HERO_GIVEN,
  LB_HERO_LOGO,
  LB_HERO_STAT,
  LB_NAME_FADE_H,
  leaderBarsLayout,
} from "./leaderBarsLayout";
import {
  LEADER_GOLD,
  leaderRowName,
  maxLeaderRaw,
  squareLeaderRows,
  visibleLeaderRows,
} from "../leaderboardComposer/leaderboardFill";
import {
  loadImage,
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
  const rows = visibleLeaderRows(
    squareLeaderRows(input.rows, Boolean(input.square)),
    true,
  );
  const layout = leaderBarsLayout(rows.length, photoOnTop, boardH);
  const photo = layout.photo;
  const title = layout.title;
  const board = layout.board;
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
  const hero = rows[0];
  if (hero && leaderRowName(hero)) {
    const fadeH = Math.min(LB_NAME_FADE_H, photo.h) * scale;
    const fadeTeam = getTeam(hero.teamId);
    const fadeLogo = fadeTeam ? await loadImage(fadeTeam.logoSrc) : null;
    const s = scale;
    drawPlayerNameFade(context, {
      x: photo.x * s,
      y: (photo.y + photo.h) * s - fadeH,
      w: photo.w * s,
      h: fadeH,
      given: hero.firstName,
      family: hero.lastName,
      logo: fadeLogo,
      logoSrc: fadeTeam?.logoSrc,
      logoSize: LB_HERO_LOGO * s,
      familySize: LB_HERO_FAMILY * s,
      givenSize: LB_HERO_GIVEN * s,
      scale: s,
      nameStyle: readComposerNameStyle(),
      stat: hero.value,
      statSize: LB_HERO_STAT * s,
      statColor: LEADER_GOLD,
    });
  }
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
    input.purpleFlair,
  );
  const max = maxLeaderRaw(rows);
  const plates = input.namePlates === true;
  const rowH = layout.rowH;
  const gap = LB_GAP;
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
      plates,
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
