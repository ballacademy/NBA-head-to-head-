import {
  paintCellFrame,
  paintPurpleBaGlow,
  paintPurpleCornerBloom,
  paintPurplePlateEdge,
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
  CHARCOAL_FLOOR,
  FIELD_TEXTURE_SRC,
  PLOT_HAIRLINE,
  paintBoardField,
  paintHeaderMetalField,
  paintStuddedCharcoal,
} from "../standingsComposer/headerTexture";
import { getTeamColors } from "../lib/teamColors";
import { getTeam } from "../standingsComposer/teams";
import { teamLogoSrc } from "../everyTeamComposer/historicalRosters";
import { formatComposerName } from "../instagramComposer/composerNameStyle";
import { ellipsisOverflowName } from "../instagramComposer/nameFit";
import { LB_LOGO_SIZE, LB_TRACK_GOLD_H, LB_TRACK_H, leaderBarsRowCols } from "../leaderBarsComposer/leaderBarsLayout";
import { LEADER_GOLD, type LeaderRow } from "./leaderboardFill";
import { leaderPlateAccent, leaderPlateFill } from "./leaderPlate";

export { leaderPlateAccent, leaderPlateFill, packedLeaderRowH } from "./leaderPlate";

export const POSTER_FONT = "Montserrat, ui-sans-serif, system-ui, sans-serif";
export const RANK_GOLD = "#d4af37";
export const RANK_SILVER = "#c0c7d0";
export const RANK_BRONZE = "#c47a3a";

export const rankMetalFill = (rank: number, quiet = "rgba(255,255,255,0.55)") =>
  rank === 1 ? RANK_GOLD : rank === 2 ? RANK_SILVER : rank === 3 ? RANK_BRONZE : quiet;
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

/** Shot mix: stacked metal through the title plate, charcoal floor under the table. */
export const paintLeaderTitleMetalFloor = async (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  titleBottom: number,
  scale: number,
) => {
  const metal = await loadImage(FIELD_TEXTURE_SRC);
  paintHeaderMetalField(context, metal, width, height, titleBottom, scale);
};

export const paintLeaderCharcoalPane = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  scale: number,
) => {
  if (w < 1 || h < 1) {
    return;
  }
  paintStuddedCharcoal(context, x, y, w, h, scale);
};

/** Horizontal hairlines across a charcoal list/column pane. */
export const paintLeaderHairlineRows = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  count: number,
  scale: number,
) => {
  paintLeaderCharcoalPane(context, x, y, w, h, scale);
  const n = Math.max(1, count);
  if (n < 2 || h < 2) {
    return;
  }
  context.save();
  context.strokeStyle = PLOT_HAIRLINE;
  context.lineWidth = Math.max(1, 0.7 * scale);
  const step = h / n;
  for (let index = 1; index < n; index += 1) {
    const yy = y + index * step;
    context.beginPath();
    context.moveTo(x, yy);
    context.lineTo(x + w, yy);
    context.stroke();
  }
  context.restore();
};

export const paintLeaderCharcoalBoard = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) => {
  context.fillStyle = CHARCOAL_FLOOR;
  context.fillRect(0, 0, width, height);
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

const roundPlate = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) => {
  context.beginPath();
  if (typeof context.roundRect === "function") {
    context.roundRect(x, y, w, h, r);
    return;
  }
  context.rect(x, y, w, h);
};

const paintNamePlate = async (
  context: CanvasRenderingContext2D,
  row: LeaderRow,
  x: number,
  y: number,
  w: number,
  h: number,
  scale: number,
  gold = false,
) => {
  const s = scale;
  const radius = Math.min(8 * s, h / 4);
  context.save();
  roundPlate(context, x, y, w, h, radius);
  context.clip();
  context.fillStyle = leaderPlateFill(row.teamId);
  context.fillRect(x, y, w, h);
  context.fillStyle = gold ? LEADER_GOLD : leaderPlateAccent(row.teamId);
  context.fillRect(x, y, Math.max(4 * s, 6 * s), h);
  if (row.teamId) {
    const mark = Math.min(h * 0.78, 72 * s);
    context.globalAlpha = 0.18;
    await paintTeamLogo(
      context,
      row.teamId,
      x + w - mark - 10 * s,
      y + (h - mark) / 2,
      mark,
    );
    context.globalAlpha = 1;
  }
  context.restore();
  context.save();
  context.strokeStyle = gold ? LEADER_GOLD : "rgba(0,0,0,0.35)";
  context.lineWidth = Math.max(1, gold ? 1.6 * s : 1 * s);
  roundPlate(context, x + 0.5, y + 0.5, w - 1, h - 1, Math.max(0, radius - 0.5));
  context.stroke();
  context.restore();
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
  namePlates = false,
) => {
  const s = scale;
  const gold = goldFirst && rank === 1;
  const cols = leaderBarsRowCols(w / s);
  if (namePlates) {
    await paintNamePlate(context, row, x, y, w, h, scale, gold);
  }
  const rankSize = namePlates ? Math.min(22 * s, h * 0.4) : 16 * s;
  context.font = `900 ${rankSize}px ${POSTER_FONT}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = gold ? LEADER_GOLD : "rgba(255,255,255,0.55)";
  context.fillText(
    String(rank),
    x + (cols.rankX + cols.rankW / 2) * s,
    y + h / 2,
  );
  const logoSize = Math.min(h - 16 * s, LB_LOGO_SIZE * s);
  const logoX = x + cols.logoX * s + (cols.logoW * s - logoSize) / 2;
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
  const nameSize = namePlates ? Math.min(20 * s, h * 0.34) : 28 * s;
  context.font = `900 ${nameSize}px ${POSTER_FONT}`;
  context.fillStyle = "#fff";
  context.textAlign = "left";
  const nameX = x + cols.nameX * s;
  const nameW = cols.nameW * s;
  context.fillText(name.toUpperCase(), nameX, y + h / 2, Math.max(0, nameW - 4 * s));
  const barX = x + cols.barX * s;
  const barW = cols.barW * s;
  const frac = row.rawValue != null && max > 0 ? Math.min(1, row.rawValue / max) : 0;
  const fillW = Math.max(frac > 0 ? 12 * s : 0, barW * frac);
  const trackH = gold ? LB_TRACK_GOLD_H * s : LB_TRACK_H * s;
  const barY = y + (h - trackH) / 2;
  context.fillStyle = "rgba(255,255,255,0.08)";
  context.fillRect(barX, barY, barW, trackH);
  if (fillW > 0) {
    const teamFill = row.teamId ? getTeamColors(row.teamId).primary : "#f4f4f4";
    context.fillStyle = teamColorBars
      ? teamFill
      : gold
        ? LEADER_GOLD
        : teamFill;
    context.fillRect(barX, barY, fillW, trackH);
  }
  const valueSize = namePlates ? Math.min(24 * s, h * 0.38) : 56 * s;
  context.font = `900 ${valueSize}px ${POSTER_FONT}`;
  context.textAlign = "right";
  context.fillStyle = gold ? LEADER_GOLD : "#fff";
  context.fillText(
    row.value,
    x + (cols.valueX + cols.valueW - cols.pad) * s,
    y + h / 2,
    cols.valueW * s,
  );
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
  namePlates = false,
  punch = false,
) => {
  const s = scale;
  if (namePlates) {
    await paintNamePlate(context, row, x, y + 1 * s, w, h - 2 * s, scale, highlight);
  } else if (highlight) {
    context.fillStyle = "rgba(212, 175, 55, 0.18)";
    context.fillRect(x, y, w, h);
  }
  const compact = !punch && !namePlates;
  const rankSize = punch
    ? Math.min(Math.round(h * 0.11), 18 * s)
    : namePlates
      ? Math.min(22 * s, h * 0.38)
      : Math.min(18 * s, Math.round(h * 0.34));
  context.font = `900 ${rankSize}px ${POSTER_FONT}`;
  context.textAlign = compact ? "center" : "left";
  context.textBaseline = "middle";
  context.fillStyle = highlight ? LEADER_GOLD : rankMetalFill(rank);
  context.fillText(String(rank), compact ? x + 13 * s : x + 6 * s, y + h / 2);
  const logoSize = compact
    ? Math.min(h - 8 * s, 22 * s)
    : Math.min(h - (punch ? 24 * s : 8 * s), punch ? 28 * s : 32 * s);
  const logoX = x + (compact ? 28 * s : punch ? 26 * s : 40 * s);
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
  const name = (
    punch
      ? row.lastName || row.firstName || formatComposerName(row.firstName, row.lastName)
      : formatComposerName(row.firstName, row.lastName)
  ).toUpperCase();
  context.fillStyle = highlight ? LEADER_GOLD : "#fff";
  const nameSize = punch
    ? Math.min(Math.round(h * 0.2), 42 * s)
    : namePlates
      ? Math.min(18 * s, h * 0.32)
      : Math.round(h * 0.34);
  context.font = `900 ${nameSize}px ${POSTER_FONT}`;
  context.textAlign = "left";
  const nameX = logoX + logoSize + (compact ? 4 * s : 8 * s);
  const valueW = punch ? 170 * s : compact ? 44 * s : 80 * s;
  const nameMax = Math.max(48 * s, w - (nameX - x) - valueW - (compact ? 2 * s : 0));
  const fitted = ellipsisOverflowName(name, nameMax, (value) =>
    context.measureText(value).width,
  );
  context.fillText(fitted, nameX, y + h / 2);
  context.textAlign = "right";
  const valueSize = punch
    ? Math.min(Math.round(h * 0.3), 64 * s)
    : namePlates
      ? Math.min(22 * s, h * 0.36)
      : Math.round(h * 0.4);
  context.font = `900 ${valueSize}px ${POSTER_FONT}`;
  context.fillStyle = highlight ? LEADER_GOLD : rankMetalFill(rank, "#fff");
  context.fillText(row.value, x + w - 10 * s, y + h / 2, valueW);
};

export const paintTitlePlate = (
  context: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
  w: number,
  h: number,
  scale: number,
  purpleFlair = false,
) => {
  const s = scale;
  paintStuddedCharcoal(context, x, y, w, h, scale);
  context.strokeStyle = "#fff";
  context.lineWidth = Math.max(2, 3 * s);
  context.strokeRect(x + 1.5 * s, y + 1.5 * s, w - 3 * s, h - 3 * s);
  if (purpleFlair) {
    paintPurplePlateEdge(context, x, y, w, h, scale);
  }
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
