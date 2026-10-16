import {
  paintCellFrame,
  paintPurpleBaGlow,
  paintPurpleCornerBloom,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import {
  composerWatermarkOpacity,
  parseComposerWatermark,
} from "../instagramComposer/composerWatermark";
import {
  applyPhotoGrade,
  canvasGradeFilter,
  gradePanelFill,
  gradedWatermarkOpacity,
} from "../instagramComposer/photoGrade";
import { paintPhotoVignette } from "../instagramComposer/photoVignette";
import { getTeamColors } from "../lib/teamColors";
import { loadCorsImage } from "../lib/playerHeadshots";
import { coverPanDraw } from "../playerOfTheDayComposer/playerOfTheDayLayout";
import {
  photoRotate,
  photoZoom,
} from "../playerOfTheDayComposer/playerOfTheDayState";
import { drawCenteredLogo } from "../standingsComposer/logoDraw";
import {
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  STORY_DESIGN_HEIGHT,
} from "../standingsComposer/rankingState";
import { getTeam } from "../standingsComposer/teams";
import {
  inkOnHex,
  STC_BA_INSET,
  STC_BA_SIZE,
  STC_HAIRLINE,
  STC_INK,
  STC_LOGO,
  STC_LOGO_INSET,
  STC_MATCHUP_H,
  STC_MATCHUP_SIZE,
  STC_MUTED,
  STC_NAME_SIZE,
  STC_NAME_TRACK,
  STC_NAME_W,
  STC_PANEL,
  STC_RULE,
  STC_STATS_W,
  parseStatsLeft,
  statCardFeedRects,
  statCardRows,
  statCardStoryColumns,
  statCardStoryRects,
  statCardStoryType,
  statCardType,
} from "./statCardLayout";
import { playerName, type StatCardDraft } from "./statCardState";

const POSTER_FONT = "Montserrat, ui-sans-serif, system-ui, sans-serif";

const loadImage = (src: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image.naturalWidth > 0 ? image : null);
    image.onerror = () => resolve(null);
    image.src = src;
  });

const setLetterSpacing = (
  context: CanvasRenderingContext2D,
  tracking: number,
) => {
  const spaced = context as CanvasRenderingContext2D & { letterSpacing: string };
  if (typeof spaced.letterSpacing === "string") {
    spaced.letterSpacing = `${tracking}px`;
  }
};

export type StatCardRenderInput = StatCardDraft & {
  look?: ComposerLook;
  purpleFlair?: boolean;
  photoGrade?: boolean;
  story?: boolean;
};

export const renderStatCardCanvas = async (
  input: StatCardRenderInput,
  scale = 2,
) => {
  const story = input.story === true;
  const boardH = story ? STORY_DESIGN_HEIGHT : GRAPHIC_HEIGHT;
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
  const s = scale;
  context.fillStyle = "#0b0b0b";
  context.fillRect(0, 0, width, height);

  const storyRects = statCardStoryRects(boardH);
  const feed = statCardFeedRects(parseStatsLeft(input.statsLeft));
  const photoBox = story
    ? {
        x: storyRects.photo.x * s,
        y: storyRects.photo.y * s,
        w: storyRects.photo.w * s,
        h: storyRects.photo.h * s,
      }
    : { x: feed.photo.x * s, y: 0, w: feed.photo.w * s, h: height };
  if (input.photoSrc) {
    const photo = input.photoSrc.startsWith("data:")
      ? await loadImage(input.photoSrc)
      : await loadCorsImage(input.photoSrc);
    if (photo) {
      const dest = coverPanDraw(
        photo.naturalWidth || photo.width,
        photo.naturalHeight || photo.height,
        photoBox.x,
        photoBox.y,
        photoBox.w,
        photoBox.h,
        input.pan.x,
        input.pan.y,
        photoZoom(input.pan),
      );
      context.save();
      context.filter = canvasGradeFilter(input.photoGrade);
      context.beginPath();
      context.rect(photoBox.x, photoBox.y, photoBox.w, photoBox.h);
      context.clip();
      const rotate = photoRotate(input.pan);
      if (rotate) {
        context.translate(photoBox.x + photoBox.w / 2, photoBox.y + photoBox.h / 2);
        context.rotate((rotate * Math.PI) / 180);
        context.drawImage(
          photo,
          dest.dx - (photoBox.x + photoBox.w / 2),
          dest.dy - (photoBox.y + photoBox.h / 2),
          dest.dw,
          dest.dh,
        );
      } else {
        context.drawImage(photo, dest.dx, dest.dy, dest.dw, dest.dh);
      }
      context.restore();
      applyPhotoGrade(
        context,
        photoBox.x,
        photoBox.y,
        photoBox.w,
        photoBox.h,
        input.photoGrade,
      );
      paintPhotoVignette(
        context,
        photoBox.x,
        photoBox.y,
        photoBox.w,
        photoBox.h,
        input.photoGrade,
      );
    }
  }

  const statsX = story ? storyRects.stats.x * s : feed.stats.x * s;
  const statsY = story ? storyRects.stats.y * s : 0;
  const statsW = story ? storyRects.stats.w * s : STC_STATS_W * s;
  const statsPanelH = story ? storyRects.stats.h * s : height;
  context.fillStyle = gradePanelFill(STC_PANEL, input.photoGrade);
  context.fillRect(statsX, statsY, statsW, statsPanelH);

  const teamForMark = getTeam(input.teamId);
  const watermark = parseComposerWatermark(input.watermark);
  if (teamForMark && watermark !== "off") {
    const mark = await loadImage(teamForMark.logoSrc);
    if (mark) {
      const size = 220 * s;
      context.save();
      context.globalAlpha = gradedWatermarkOpacity(
        composerWatermarkOpacity(watermark),
        input.photoGrade,
      );
      drawCenteredLogo(
        context,
        mark,
        statsX + (statsW - size) / 2,
        statsY + (statsPanelH - size) / 2,
        size,
        size,
        {
          cacheKey: `${teamForMark.logoSrc}-statcard-mark`,
          fitX: 0.9,
          fitY: 0.9,
          shadow: 0,
        },
      );
      context.restore();
    }
  }

  const showMatchup = input.showMatchup === true;
  const matchup = showMatchup ? (input.matchup ?? "").trim() : "";
  const type = story
    ? statCardStoryType(input.stats.length)
    : statCardType(input.stats.length);
  const paintStat = (
    line: StatCardDraft["stats"][number],
    cx: number,
    valueY: number,
    labelY: number,
    maxW: number,
  ) => {
    context.font = `900 ${type.value * s}px ${POSTER_FONT}`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = STC_INK;
    context.fillText(line.value.trim() || "—", cx, valueY, maxW);
    context.font = `900 ${type.label * s}px ${POSTER_FONT}`;
    context.fillStyle = STC_MUTED;
    context.fillText(line.label.trim().toUpperCase() || "STAT", cx, labelY);
  };

  if (story) {
    const matchupH = showMatchup ? STC_MATCHUP_H * s : 0;
    const rowH = statsPanelH - matchupH;
    const cols = statCardStoryColumns(
      input.stats.length,
      storyRects.stats.w,
      rowH / s,
    );
    input.stats.forEach((line, index) => {
      const col = cols[index]!;
      const cx = statsX + col.x * s + (col.w * s) / 2;
      if (index > 0) {
        context.fillStyle = STC_RULE;
        context.fillRect(statsX + col.x * s, statsY + 36 * s, 2 * s, rowH - 72 * s);
      }
      paintStat(
        line,
        cx,
        statsY + col.valueY * s,
        statsY + col.labelY * s,
        col.w * s - 24 * s,
      );
    });
    if (showMatchup) {
      const bandY = statsY + rowH;
      context.fillStyle = STC_RULE;
      context.fillRect(statsX + 36 * s, bandY, statsW - 72 * s, 2 * s);
      if (matchup) {
        context.font = `900 ${STC_MATCHUP_SIZE * s}px ${POSTER_FONT}`;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillStyle = STC_MUTED;
        setLetterSpacing(context, STC_MATCHUP_SIZE * s * 0.06);
        context.fillText(
          matchup,
          statsX + statsW / 2,
          bandY + matchupH / 2,
          statsW - 28 * s,
        );
        setLetterSpacing(context, 0);
      }
    }
  } else {
    const statsHeight = showMatchup
      ? GRAPHIC_HEIGHT - STC_MATCHUP_H
      : GRAPHIC_HEIGHT;
    const rows = statCardRows(input.stats.length, statsHeight);
    input.stats.forEach((line, index) => {
      const row = rows[index]!;
      if (index > 0) {
        context.fillStyle = STC_RULE;
        context.fillRect(statsX + 36 * s, row.y * s, statsW - 72 * s, 2 * s);
      }
      paintStat(
        line,
        statsX + statsW / 2,
        row.valueY * s,
        row.labelY * s,
        statsW - 24 * s,
      );
    });
    if (showMatchup) {
      const bandY = statsHeight * s;
      context.fillStyle = STC_RULE;
      context.fillRect(statsX + 36 * s, bandY, statsW - 72 * s, 2 * s);
      if (matchup) {
        context.font = `900 ${STC_MATCHUP_SIZE * s}px ${POSTER_FONT}`;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillStyle = STC_MUTED;
        setLetterSpacing(context, STC_MATCHUP_SIZE * s * 0.06);
        context.fillText(
          matchup,
          statsX + statsW / 2,
          bandY + (STC_MATCHUP_H * s) / 2,
          statsW - 28 * s,
        );
        setLetterSpacing(context, 0);
      }
    }
  }

  const team = getTeam(input.teamId);
  const colors = getTeamColors(input.teamId ?? "");
  const name = playerName(input).toUpperCase() || "PLAYER";
  if (story) {
    const nameX = storyRects.name.x * s;
    const nameY = storyRects.name.y * s;
    const nameW = storyRects.name.w * s;
    const nameH = storyRects.name.h * s;
    context.fillStyle = colors.primary;
    context.fillRect(nameX, nameY, nameW, nameH);
    const logoSize = team ? STC_LOGO * s : 0;
    context.font = `900 ${48 * s}px ${POSTER_FONT}`;
    context.textAlign = "left";
    context.textBaseline = "middle";
    setLetterSpacing(context, 0.08 * 48 * s);
    context.fillStyle = inkOnHex(colors.primary);
    context.fillText(
      name,
      nameX + 28 * s,
      nameY + nameH / 2,
      nameW - logoSize - 56 * s,
    );
    setLetterSpacing(context, 0);
    if (team) {
      const logo = await loadImage(team.logoSrc);
      if (logo) {
        const size = STC_LOGO * s;
        drawCenteredLogo(
          context,
          logo,
          nameX + nameW - size - 16 * s,
          nameY + (nameH - size) / 2,
          size,
          size,
          {
            cacheKey: `${team.logoSrc}-statcard-story`,
            fitX: 0.92,
            fitY: 0.92,
            shadow: 0,
          },
        );
      }
    }
    context.fillStyle = colors.primary;
    context.fillRect(
      storyRects.hairline.x * s,
      storyRects.hairline.y * s,
      storyRects.hairline.w * s,
      STC_HAIRLINE * s,
    );
  } else {
    const nameX = feed.name.x * s;
    const nameW = STC_NAME_W * s;
    context.fillStyle = colors.primary;
    context.fillRect(nameX, 0, nameW, height);

    const logoSpace = team ? (STC_LOGO + STC_LOGO_INSET * 2) * s : 24 * s;
    context.save();
    context.translate(nameX + nameW / 2, (height - logoSpace) / 2);
    context.rotate(feed.baRight ? -Math.PI / 2 : Math.PI / 2);
    context.font = `900 ${STC_NAME_SIZE * s}px ${POSTER_FONT}`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    setLetterSpacing(context, STC_NAME_TRACK * STC_NAME_SIZE * s);
    context.fillStyle = inkOnHex(colors.primary);
    context.fillText(name, 0, 0, height - logoSpace - 24 * s);
    setLetterSpacing(context, 0);
    context.restore();

    if (team) {
      const logo = await loadImage(team.logoSrc);
      if (logo) {
        const size = STC_LOGO * s;
        const lx = nameX + (nameW - size) / 2;
        const ly = height - size - STC_LOGO_INSET * s;
        drawCenteredLogo(context, logo, lx, ly, size, size, {
          cacheKey: `${team.logoSrc}-statcard`,
          fitX: 0.92,
          fitY: 0.92,
          shadow: 0,
        });
      }
    }

    context.fillStyle = colors.primary;
    context.fillRect(feed.hairlineX * s, 0, STC_HAIRLINE * s, height);
  }

  if (input.purpleFlair) {
    paintPurpleCornerBloom(context, width, height, s);
  }
  paintCellFrame(context, 0, 0, width, height, input.look, s);

  if (input.showBa !== false) {
    const ba = await loadImage("/ba-logo-circled.png");
    if (ba) {
      const size = STC_BA_SIZE * s;
      const inset = STC_BA_INSET * s;
      const baX =
        !story && feed.baRight ? width - inset - size : inset;
      if (input.purpleFlair) {
        paintPurpleBaGlow(context, baX, inset, size);
      }
      context.drawImage(ba, baX, inset, size, size);
    }
  }

  return canvas;
};
