import {
  paintCellFrame,
  paintPurpleBaGlow,
  paintPurpleCornerBloom,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import { readComposerBaCorner } from "../instagramComposer/composerBaCorner";
import {
  applyPhotoGrade,
  canvasGradeFilter,
} from "../instagramComposer/photoGrade";
import { paintPhotoVignette } from "../instagramComposer/photoVignette";
import { loadCorsImage } from "../lib/playerHeadshots";
import { coverPanDraw } from "../playerOfTheDayComposer/playerOfTheDayLayout";
import {
  photoRotate,
  photoZoom,
  type PhotoPan,
} from "../playerOfTheDayComposer/playerOfTheDayState";
import {
  FIELD_TEXTURE_SRC,
  paintBoardField,
} from "../standingsComposer/headerTexture";
import { getTeam } from "../standingsComposer/teams";
import { teamLogoSrc } from "../everyTeamComposer/historicalRosters";
import { formatComposerName } from "../instagramComposer/composerNameStyle";
import { abbreviateOverflowName } from "../instagramComposer/nameFit";
import { LEADER_GOLD, type LeaderRow } from "./leaderboardFill";

export const POSTER_FONT = "Montserrat, ui-sans-serif, system-ui, sans-serif";
export const BA_SRC = "/ba-logo-circled.png";
export const BA_SIZE = 72;
export const BA_INSET = 42;

export const loadImage = (src: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image.naturalWidth > 0 ? image : null);
    image.onerror = () => resolve(null);
    image.src = src;
  });

export const setTracking = (
  context: CanvasRenderingContext2D,
  tracking: number,
) => {
  const spaced = context as CanvasRenderingContext2D & { letterSpacing: string };
  if (typeof spaced.letterSpacing === "string") {
    spaced.letterSpacing = `${tracking}px`;
  }
};

export const paintLeaderPhoto = async (
  context: CanvasRenderingContext2D,
  src: string | null,
  pan: PhotoPan,
  x: number,
  y: number,
  w: number,
  h: number,
  photoGrade?: boolean,
) => {
  if (!src || w < 1 || h < 1) {
    context.fillStyle = "#121214";
    context.fillRect(x, y, w, h);
    return;
  }
  const photo = src.startsWith("data:")
    ? await loadImage(src)
    : await loadCorsImage(src);
  if (!photo) {
    context.fillStyle = "#121214";
    context.fillRect(x, y, w, h);
    return;
  }
  const dest = coverPanDraw(
    photo.naturalWidth || photo.width,
    photo.naturalHeight || photo.height,
    x,
    y,
    w,
    h,
    pan.x,
    pan.y,
    photoZoom(pan),
  );
  const rotate = photoRotate(pan);
  context.save();
  context.beginPath();
  context.rect(x, y, w, h);
  context.clip();
  context.filter = canvasGradeFilter(photoGrade);
  if (rotate) {
    context.translate(x + w / 2, y + h / 2);
    context.rotate((rotate * Math.PI) / 180);
    context.drawImage(
      photo,
      dest.dx - (x + w / 2),
      dest.dy - (y + h / 2),
      dest.dw,
      dest.dh,
    );
  } else {
    context.drawImage(photo, dest.dx, dest.dy, dest.dw, dest.dh);
  }
  context.restore();
  applyPhotoGrade(context, x, y, w, h, photoGrade);
  paintPhotoVignette(context, x, y, w, h, photoGrade);
};

export const paintLeaderMetal = async (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  _scale: number,
) => {
  const metal = await loadImage(FIELD_TEXTURE_SRC);
  paintBoardField(context, metal, width, height);
};

export const paintLeaderFrame = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  look: ComposerLook | undefined,
  scale: number,
  purpleFlair?: boolean,
) => {
  if (purpleFlair) {
    paintPurpleCornerBloom(context, width, height, scale);
  }
  paintCellFrame(context, 0, 0, width, height, look, scale);
};

export const paintLeaderBa = async (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  scale: number,
  showBa: boolean,
  purpleFlair?: boolean,
) => {
  if (!showBa) {
    return;
  }
  const ba = await loadImage(BA_SRC);
  if (!ba) {
    return;
  }
  const size = BA_SIZE * scale;
  const inset = BA_INSET * scale;
  const corner = readComposerBaCorner();
  let x = width - inset - size;
  let y = inset;
  if (corner === "top-left") {
    x = inset * 0.52;
  } else if (corner === "bottom-right") {
    y = height - inset * 0.52 - size;
  }
  if (purpleFlair) {
    paintPurpleBaGlow(context, x, y, size);
  }
  context.drawImage(ba, x, y, size, size);
};

export const paintTeamLogo = async (
  context: CanvasRenderingContext2D,
  teamId: string | null,
  x: number,
  y: number,
  size: number,
) => {
  if (!teamId) {
    return;
  }
  const src = getTeam(teamId)?.logoSrc ?? teamLogoSrc(teamId, "2026-27");
  const logo = await loadImage(src);
  if (!logo) {
    return;
  }
  const iw = logo.naturalWidth || logo.width;
  const ih = logo.naturalHeight || logo.height;
  const scale = Math.min(size / Math.max(1, iw), size / Math.max(1, ih));
  const dw = iw * scale;
  const dh = ih * scale;
  context.drawImage(
    logo,
    x + (size - dw) / 2,
    y + (size - dh) / 2 - size * 0.03,
    dw,
    dh,
  );
};

export const paintBarRow = async (
  context: CanvasRenderingContext2D,
  row: LeaderRow,
  rank: number,
  x: number,
  y: number,
  w: number,
  h: number,
  max: number,
  goldFirst: boolean,
  teamColorBars: boolean,
  showHeadshots: boolean,
  scale: number,
) => {
  const s = scale;
  const gold = goldFirst && rank === 1;
  const pad = 10 * s;
  context.fillStyle = gold ? "rgba(212, 175, 55, 0.16)" : "rgba(255,255,255,0.04)";
  context.fillRect(x, y, w, h);
  context.strokeStyle = gold ? LEADER_GOLD : "rgba(255,255,255,0.22)";
  context.lineWidth = Math.max(1, 1.25 * s);
  context.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  context.font = `900 ${Math.round(h * 0.42)}px ${POSTER_FONT}`;
  context.textAlign = "left";
  context.textBaseline = "middle";
  context.fillStyle = gold ? LEADER_GOLD : "#fff";
  context.fillText(String(rank), x + pad, y + h / 2);
  const logoX = x + 52 * s;
  const logoSize = Math.min(h - 10 * s, 36 * s);
  if (showHeadshots && row.headshotUrl) {
    const shot = await loadCorsImage(row.headshotUrl);
    if (shot) {
      context.save();
      context.beginPath();
      context.arc(
        logoX + logoSize / 2,
        y + h / 2,
        logoSize / 2,
        0,
        Math.PI * 2,
      );
      context.clip();
      context.drawImage(
        shot,
        logoX,
        y + (h - logoSize) / 2,
        logoSize,
        logoSize,
      );
      context.restore();
    }
  } else {
    await paintTeamLogo(
      context,
      row.teamId,
      logoX,
      y + (h - logoSize) / 2,
      logoSize,
    );
  }
  const name = formatComposerName(row.firstName, row.lastName) || "";
  context.font = `900 ${Math.round(h * 0.36)}px ${POSTER_FONT}`;
  context.fillStyle = "#fff";
  context.textAlign = "left";
  const nameX = logoX + logoSize + 10 * s;
  const barX = nameX + 220 * s;
  const valueW = 92 * s;
  const barW = Math.max(40 * s, w - (barX - x) - valueW - pad);
  context.fillText(name.toUpperCase(), nameX, y + h / 2, 210 * s);
  const frac = row.rawValue != null && max > 0 ? Math.min(1, row.rawValue / max) : 0;
  const fillW = Math.max(frac > 0 ? 12 * s : 0, barW * frac);
  const barY = y + h * 0.32;
  const barH = h * 0.36;
  context.fillStyle = "rgba(255,255,255,0.08)";
  context.fillRect(barX, barY, barW, barH);
  if (fillW > 0) {
    context.fillStyle = teamColorBars && row.teamId
      ? (getTeam(row.teamId)?.cellFrom ?? LEADER_GOLD)
      : gold
        ? LEADER_GOLD
        : "#f4f4f4";
    context.fillRect(barX, barY, fillW, barH);
  }
  context.font = `900 ${Math.round(h * 0.4)}px ${POSTER_FONT}`;
  context.textAlign = "right";
  context.fillStyle = gold ? LEADER_GOLD : "#fff";
  context.fillText(row.value, x + w - pad, y + h / 2, valueW);
};

export const paintListRow = async (
  context: CanvasRenderingContext2D,
  row: LeaderRow,
  rank: number,
  x: number,
  y: number,
  w: number,
  h: number,
  highlight: boolean,
  showHeadshots: boolean,
  scale: number,
) => {
  const s = scale;
  if (highlight) {
    context.fillStyle = "rgba(212, 175, 55, 0.18)";
    context.fillRect(x, y, w, h);
  }
  context.font = `900 ${Math.round(h * 0.42)}px ${POSTER_FONT}`;
  context.textAlign = "left";
  context.textBaseline = "middle";
  context.fillStyle = highlight ? LEADER_GOLD : "rgba(255,255,255,0.7)";
  context.fillText(String(rank), x + 8 * s, y + h / 2);
  const logoSize = Math.min(h - 8 * s, 32 * s);
  const logoX = x + 40 * s;
  if (showHeadshots && row.headshotUrl) {
    const shot = await loadCorsImage(row.headshotUrl);
    if (shot) {
      context.save();
      context.beginPath();
      context.arc(
        logoX + logoSize / 2,
        y + h / 2,
        logoSize / 2,
        0,
        Math.PI * 2,
      );
      context.clip();
      context.drawImage(shot, logoX, y + (h - logoSize) / 2, logoSize, logoSize);
      context.restore();
    }
  } else {
    await paintTeamLogo(
      context,
      row.teamId,
      logoX,
      y + (h - logoSize) / 2,
      logoSize,
    );
  }
  const name = formatComposerName(row.firstName, row.lastName).toUpperCase();
  context.fillStyle = highlight ? LEADER_GOLD : "#fff";
  context.font = `900 ${Math.round(h * 0.34)}px ${POSTER_FONT}`;
  const nameX = logoX + logoSize + 8 * s;
  const nameMax = Math.max(48 * s, w - (nameX - x) - 70 * s);
  const fitted = abbreviateOverflowName(name, nameMax, (value) =>
    context.measureText(value).width,
  );
  context.fillText(fitted, nameX, y + h / 2, nameMax);
  context.textAlign = "right";
  context.font = `900 ${Math.round(h * 0.4)}px ${POSTER_FONT}`;
  context.fillText(row.value, x + w - 10 * s, y + h / 2, 80 * s);
};

export const paintTitlePlate = (
  context: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
  w: number,
  h: number,
  scale: number,
) => {
  const s = scale;
  context.fillStyle = "#1c1c1c";
  context.fillRect(x, y, w, h);
  context.strokeStyle = "#fff";
  context.lineWidth = Math.max(2, 3 * s);
  context.strokeRect(x + 1.5 * s, y + 1.5 * s, w - 3 * s, h - 3 * s);
  const size = lines.length > 1 ? 36 * s : 42 * s;
  context.font = `900 ${size}px ${POSTER_FONT}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#fff";
  setTracking(context, 0.04 * size);
  const lineH = size * 1.05;
  const start = y + h / 2 - ((lines.length - 1) * lineH) / 2;
  lines.forEach((line, index) => {
    context.fillText(line, x + w / 2, start + index * lineH, w - 32 * s);
  });
  setTracking(context, 0);
};
