import {
  paintCellFrame,
  paintPurpleBaGlow,
  paintPurpleCornerBloom,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import { paintPhotoVignette } from "../instagramComposer/photoVignette";
import { getTeamColors } from "../lib/teamColors";
import { loadCorsImage } from "../lib/playerHeadshots";
import { coverPanDraw } from "../playerOfTheDayComposer/playerOfTheDayLayout";
import {
  photoRotate,
  photoZoom,
} from "../playerOfTheDayComposer/playerOfTheDayState";
import { drawCenteredLogo } from "../standingsComposer/logoDraw";
import { GRAPHIC_HEIGHT, GRAPHIC_WIDTH } from "../standingsComposer/rankingState";
import { getTeam } from "../standingsComposer/teams";
import {
  inkOnHex,
  STC_BA_INSET,
  STC_BA_SIZE,
  STC_HAIRLINE,
  STC_INK,
  STC_LABEL_SIZE,
  STC_LOGO,
  STC_LOGO_INSET,
  STC_MUTED,
  STC_NAME_SIZE,
  STC_NAME_TRACK,
  STC_NAME_W,
  STC_NAME_X,
  STC_PANEL,
  STC_PHOTO_W,
  STC_RULE,
  STC_STATS_W,
  STC_STATS_X,
  STC_VALUE_SIZE,
  statCardRows,
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
};

export const renderStatCardCanvas = async (
  input: StatCardRenderInput,
  scale = 2,
) => {
  const width = GRAPHIC_WIDTH * scale;
  const height = GRAPHIC_HEIGHT * scale;
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

  const photoW = STC_PHOTO_W * s;
  if (input.photoSrc) {
    const photo = input.photoSrc.startsWith("data:")
      ? await loadImage(input.photoSrc)
      : await loadCorsImage(input.photoSrc);
    if (photo) {
      const dest = coverPanDraw(
        photo.naturalWidth || photo.width,
        photo.naturalHeight || photo.height,
        0,
        0,
        photoW,
        height,
        input.pan.x,
        input.pan.y,
        photoZoom(input.pan),
      );
      context.save();
      context.beginPath();
      context.rect(0, 0, photoW, height);
      context.clip();
      const rotate = photoRotate(input.pan);
      if (rotate) {
        context.translate(photoW / 2, height / 2);
        context.rotate((rotate * Math.PI) / 180);
        context.drawImage(
          photo,
          dest.dx - photoW / 2,
          dest.dy - height / 2,
          dest.dw,
          dest.dh,
        );
      } else {
        context.drawImage(photo, dest.dx, dest.dy, dest.dw, dest.dh);
      }
      context.restore();
      paintPhotoVignette(context, 0, 0, photoW, height);
    }
  }

  const statsX = STC_STATS_X * s;
  const statsW = STC_STATS_W * s;
  context.fillStyle = STC_PANEL;
  context.fillRect(statsX, 0, statsW, height);

  const rows = statCardRows(input.stats.length);
  input.stats.forEach((line, index) => {
    const row = rows[index]!;
    if (index > 0) {
      context.fillStyle = STC_RULE;
      context.fillRect(
        statsX + 36 * s,
        row.y * s,
        statsW - 72 * s,
        2 * s,
      );
    }
    context.font = `900 ${STC_VALUE_SIZE * s}px ${POSTER_FONT}`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = STC_INK;
    context.fillText(
      line.value.trim() || "—",
      statsX + statsW / 2,
      row.valueY * s,
      statsW - 24 * s,
    );
    context.font = `900 ${STC_LABEL_SIZE * s}px ${POSTER_FONT}`;
    context.fillStyle = STC_MUTED;
    context.fillText(
      line.label.trim().toUpperCase() || "STAT",
      statsX + statsW / 2,
      row.labelY * s,
    );
  });

  const team = getTeam(input.teamId);
  const colors = getTeamColors(input.teamId ?? "");
  const nameX = STC_NAME_X * s;
  const nameW = STC_NAME_W * s;
  context.fillStyle = colors.primary;
  context.fillRect(nameX, 0, nameW, height);

  const name = playerName(input).toUpperCase() || "PLAYER";
  const logoSpace = team ? (STC_LOGO + STC_LOGO_INSET * 2) * s : 24 * s;
  context.save();
  context.translate(nameX + nameW / 2, (height - logoSpace) / 2);
  context.rotate(Math.PI / 2);
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
  context.fillRect(
    (STC_PHOTO_W - STC_HAIRLINE / 2) * s,
    0,
    STC_HAIRLINE * s,
    height,
  );

  if (input.purpleFlair) {
    paintPurpleCornerBloom(context, width, height, s);
  }
  paintCellFrame(context, 0, 0, width, height, input.look, s);

  if (input.showBa !== false) {
    const ba = await loadImage("/ba-logo-circled.png");
    if (ba) {
      const size = STC_BA_SIZE * s;
      const inset = STC_BA_INSET * s;
      if (input.purpleFlair) {
        paintPurpleBaGlow(context, inset, inset, size);
      }
      context.drawImage(ba, inset, inset, size, size);
    }
  }

  return canvas;
};
