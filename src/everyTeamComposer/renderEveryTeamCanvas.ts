import {
  clipToInnerFrame,
  frameColor,
  paintCellFrame,
  paintPurpleBaGlow,
  paintPurpleCornerBloom,
  paintPurpleInnerHairline,
  paintPurplePathHalo,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import {
  BANNER_STROKE_VB,
  BRAND_FONT,
  BRAND_TRACKING_EM,
  bannerBoardRect,
  brandBaselineY,
} from "../standingsComposer/bannerLayout";
import {
  FIELD_TEXTURE_SRC,
  drawBannerInterior,
  paintBoardField,
} from "../standingsComposer/headerTexture";
import { drawCoveredLogo } from "../standingsComposer/logoDraw";
import { GRAPHIC_BG } from "../standingsComposer/rankingState";
import { canvasToPngBlob } from "../standingsComposer/renderStandingsCanvas";
import { loadCorsImage } from "../lib/playerHeadshots";
import { drawCoverHeadshot } from "../tierListComposer/PlayerHeadshot";
import {
  composerNameLines,
  formatComposerName,
  readComposerNameStyle,
} from "../instagramComposer/composerNameStyle";
import { paintNameFadeRect, drawNameStack } from "../instagramComposer/drawPlayerNameFade";
import { splitPlayerName } from "../teamOfTheWeekComposer/teamOfTheWeekState";
import {
  everyTeamCurrentSeason,
  formatSeasonShort,
  getRosterPlayer,
  isMissingSeason,
  seasonForTeam,
  teamLogoSrc,
} from "./historicalRosters";
import {
  ET_RANK_BADGE_H,
  ET_RANK_BADGE_INSET,
  ET_RANK_BADGE_PAD_X,
  ET_RANK_SIZE,
  ET_TITLE_SIZE,
  ET_TITLE_TRACK,
  everyTeamBannerRectPath,
  everyTeamCellRect,
  everyTeamGrid,
  everyTeamLogoBackdrop,
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
} from "./everyTeamLayout";
import {
  displayedTeams,
  slotIndexForTeam,
  splitEveryTeamTitle,
  type EveryTeamSlots,
} from "./everyTeamState";

export { canvasToPngBlob };

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
    return true;
  }
  return false;
};

const withDropShadow = (
  context: CanvasRenderingContext2D,
  scale: number,
  paint: () => void,
) => {
  context.save();
  context.shadowColor = "rgba(0, 0, 0, 0.78)";
  context.shadowOffsetX = Math.round(1.2 * scale);
  context.shadowOffsetY = Math.round(1.5 * scale);
  context.shadowBlur = 0;
  paint();
  context.restore();
};

const drawTrackedText = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  font: string,
  tracking: number,
  fill: string,
) => {
  context.font = font;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = fill;
  if (setLetterSpacing(context, tracking)) {
    context.fillText(text, Math.round(x), Math.round(y));
    setLetterSpacing(context, 0);
    return;
  }
  context.fillText(text, Math.round(x), Math.round(y));
};

const drawBannerRect = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) => {
  const box = everyTeamBannerRectPath(x, y, w, h);
  context.beginPath();
  context.moveTo(box.left, box.top);
  context.lineTo(box.right, box.top);
  context.lineTo(box.right, box.bottom);
  context.lineTo(box.left, box.bottom);
  context.closePath();
};

export interface EveryTeamRenderInput {
  brand: string;
  title: string;
  slots: EveryTeamSlots;
  look?: ComposerLook;
  purpleFlair?: boolean;
  showBa?: boolean;
  ranked?: boolean;
  rankedOrder?: string[];
  showNames?: boolean;
  showHistoricalLogos?: boolean;
  season?: string;
  cellSeasons?: Record<string, string>;
  duo?: boolean;
  partners?: EveryTeamSlots;
}

export const renderEveryTeamCanvas = async (
  input: EveryTeamRenderInput,
  scale = 2,
): Promise<HTMLCanvasElement> => {
  if (typeof document !== "undefined" && document.fonts?.load) {
    await Promise.all([
      document.fonts.load(`900 ${BRAND_FONT * scale}px ${POSTER_FONT}`),
      document.fonts.load(`900 ${ET_TITLE_SIZE * scale}px ${POSTER_FONT}`),
      document.fonts.load(`900 ${ET_RANK_SIZE * scale}px ${POSTER_FONT}`),
    ]).catch(() => undefined);
  }

  const width = GRAPHIC_WIDTH * scale;
  const height = GRAPHIC_HEIGHT * scale;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not open export canvas");
  }

  const fieldTexture = await loadImage(FIELD_TEXTURE_SRC);
  paintBoardField(context, fieldTexture, width, height, GRAPHIC_BG);
  if (input.purpleFlair) {
    paintPurpleCornerBloom(context, width, height, scale);
  }

  if (!input.showBa) {
    withDropShadow(context, scale, () => {
      drawTrackedText(
        context,
        input.brand.trim() || " ",
        width / 2,
        brandBaselineY(scale),
        `900 ${BRAND_FONT * scale}px ${POSTER_FONT}`,
        BRAND_TRACKING_EM * BRAND_FONT * scale,
        "#fff",
      );
    });
  }

  const board = bannerBoardRect(scale);
  const buildBannerPath = () =>
    drawBannerRect(context, board.x, board.y, board.w, board.h);
  drawBannerInterior(
    context,
    board.x,
    board.y,
    board.w,
    board.h,
    scale,
    buildBannerPath,
  );
  const bannerLine =
    input.look === "none" ? 0 : (BANNER_STROKE_VB / 200) * board.h;
  if (input.purpleFlair) {
    paintPurplePathHalo(context, scale, buildBannerPath, bannerLine);
  }
  if (bannerLine > 0) {
    buildBannerPath();
    context.strokeStyle = frameColor(input.look);
    context.lineWidth = bannerLine;
    context.lineJoin = "miter";
    context.stroke();
  }

  const titleLines = splitEveryTeamTitle(input.title);
  const titleFont = `900 ${ET_TITLE_SIZE * scale}px ${POSTER_FONT}`;
  const titleTracking = ET_TITLE_TRACK * ET_TITLE_SIZE * scale;
  const lineH = ET_TITLE_SIZE * 1.12 * scale;
  const box = everyTeamBannerRectPath(board.x, board.y, board.w, board.h);
  const blockH = lineH * titleLines.length;
  const titleTop = (box.top + box.bottom) / 2 - blockH / 2 + lineH / 2;

  withDropShadow(context, scale, () => {
    titleLines.forEach((line, index) => {
      context.font = titleFont;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.lineJoin = "round";
      context.strokeStyle = "#000";
      context.lineWidth = 2 * scale;
      const y = titleTop + index * lineH;
      if (setLetterSpacing(context, titleTracking)) {
        context.strokeText(line, width / 2, y);
        context.fillStyle = "#fff";
        context.fillText(line, width / 2, y);
        setLetterSpacing(context, 0);
      } else {
        context.strokeText(line, width / 2, y);
        context.fillStyle = "#fff";
        context.fillText(line, width / 2, y);
      }
    });
  });

  const grid = everyTeamGrid(scale);
  const ranked = input.ranked === true;
  const teams = displayedTeams(ranked, input.rankedOrder);
  const art = await Promise.all(
    teams.map(async (team) => {
      const cellSeason = seasonForTeam(
        team.id,
        input.season ?? everyTeamCurrentSeason(),
        input.cellSeasons,
      );
      const missing = isMissingSeason(team.id, cellSeason);
      const shown = getRosterPlayer(
        team.id,
        cellSeason,
        input.slots[slotIndexForTeam(team.id)] ?? null,
      );
      const partner =
        input.duo === true
          ? getRosterPlayer(
              team.id,
              cellSeason,
              input.partners?.[slotIndexForTeam(team.id)] ?? null,
            )
          : null;
      const overridden = Boolean(input.cellSeasons?.[team.id]);
      const showYear =
        overridden || cellSeason !== everyTeamCurrentSeason();
      const logoSrc = teamLogoSrc(
        team.id,
        cellSeason,
        input.showHistoricalLogos === true,
      );
      const [logo, headshot, partnerShot] = await Promise.all([
        loadImage(logoSrc),
        shown ? loadCorsImage(shown.headshotUrl) : Promise.resolve(null),
        partner ? loadCorsImage(partner.headshotUrl) : Promise.resolve(null),
      ]);
      return {
        team,
        logo,
        logoSrc,
        headshot,
        partnerShot,
        partner,
        shown,
        missing,
        cellSeason,
        showYear,
        overridden,
      };
    }),
  );

  art.forEach((cell, index) => {
    const { x, y, size } = everyTeamCellRect(index, grid);
    const gradient = context.createLinearGradient(x, y, x + size, y + size);
    gradient.addColorStop(0, cell.team.cellFrom);
    gradient.addColorStop(1, cell.team.cellTo);
    context.fillStyle = gradient;
    context.fillRect(x, y, size, size);
    context.save();
    const inner = clipToInnerFrame(context, x, y, size, size, scale, input.look);
    if (cell.logo) {
      const lift = everyTeamLogoBackdrop(cell.team.id);
      context.save();
      context.filter =
        lift.brightness === 1 ? "none" : `brightness(${lift.brightness})`;
      context.globalAlpha = lift.alpha;
      drawCoveredLogo(
        context,
        cell.logo,
        inner.x,
        inner.y,
        inner.w,
        inner.h,
        { cacheKey: `${cell.logoSrc}-cover` },
      );
      context.filter = "none";
      if (lift.brightness > 1) {
        const veil = context.createRadialGradient(
          inner.x + inner.w * 0.5,
          inner.y + inner.h * 0.42,
          inner.w * 0.08,
          inner.x + inner.w * 0.5,
          inner.y + inner.h * 0.42,
          inner.w * 0.64,
        );
        veil.addColorStop(0, "rgba(247, 251, 255, 0.22)");
        veil.addColorStop(1, "rgba(247, 251, 255, 0)");
        context.globalAlpha = 1;
        context.globalCompositeOperation = "screen";
        context.fillStyle = veil;
        context.fillRect(inner.x, inner.y, inner.w, inner.h);
        context.globalCompositeOperation = "source-over";
      }
      context.restore();
    }
    if (cell.headshot && cell.partnerShot) {
      drawCoverHeadshot(
        context,
        cell.headshot,
        inner.x - inner.w * 0.08,
        inner.y - inner.h * 0.08,
        inner.w * 0.72,
        inner.h * 1.1,
        { silhouette: true },
      );
      drawCoverHeadshot(
        context,
        cell.partnerShot,
        inner.x + inner.w * 0.36,
        inner.y - inner.h * 0.08,
        inner.w * 0.72,
        inner.h * 1.1,
        { silhouette: true },
      );
    } else if (cell.headshot || cell.partnerShot) {
      const shot = cell.headshot ?? cell.partnerShot;
      if (shot) {
        const hx = inner.x - inner.w * 0.04;
        const hy = inner.y - inner.h * 0.08;
        drawCoverHeadshot(context, shot, hx, hy, inner.w * 1.08, inner.h * 1.1, {
          silhouette: true,
        });
      }
    }
    context.restore();
    paintCellFrame(context, x, y, size, size, input.look, scale);
    if (input.purpleFlair) {
      paintPurpleInnerHairline(context, x, y, size, size, scale, input.look);
    }
    if (ranked) {
      const rankLabel = String(index + 1);
      context.save();
      context.font = `900 ${ET_RANK_SIZE * scale}px ${POSTER_FONT}`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      const textW = context.measureText(rankLabel).width;
      const badgeH = ET_RANK_BADGE_H * scale;
      const badgeW = Math.max(badgeH, textW + ET_RANK_BADGE_PAD_X * 2 * scale);
      const badgeX = x + ET_RANK_BADGE_INSET * scale;
      const badgeY = y + ET_RANK_BADGE_INSET * scale;
      const radius = badgeH / 2;
      context.beginPath();
      context.moveTo(badgeX + radius, badgeY);
      context.arcTo(badgeX + badgeW, badgeY, badgeX + badgeW, badgeY + badgeH, radius);
      context.arcTo(badgeX + badgeW, badgeY + badgeH, badgeX, badgeY + badgeH, radius);
      context.arcTo(badgeX, badgeY + badgeH, badgeX, badgeY, radius);
      context.arcTo(badgeX, badgeY, badgeX + badgeW, badgeY, radius);
      context.closePath();
      context.fillStyle = "rgba(0, 0, 0, 0.62)";
      context.fill();
      context.fillStyle = "#fff";
      context.shadowColor = "rgba(0, 0, 0, 0.7)";
      context.shadowOffsetX = Math.round(0.8 * scale);
      context.shadowOffsetY = Math.round(0.9 * scale);
      context.shadowBlur = 0;
      context.fillText(rankLabel, badgeX + badgeW / 2, badgeY + badgeH / 2);
      context.restore();
    }
    if (cell.missing) {
      context.save();
      context.font = `900 ${11 * scale}px ${POSTER_FONT}`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillStyle = "rgba(255,255,255,0.92)";
      context.fillText(
        `NO ${formatSeasonShort(cell.cellSeason)} ROSTER`,
        x + size / 2,
        y + size * 0.78,
      );
      context.restore();
    } else if (cell.showYear) {
      context.save();
      context.font = `900 ${10 * scale}px ${POSTER_FONT}`;
      context.textAlign = "right";
      context.textBaseline = "top";
      context.fillStyle = cell.overridden ? "#facc15" : "rgba(255,255,255,0.88)";
      context.fillText(
        formatSeasonShort(cell.cellSeason),
        x + size * 0.94,
        y + size * 0.06,
      );
      context.restore();
    }
    if (input.showNames === true && (cell.shown || cell.partner)) {
      const names = cell.shown ? splitPlayerName(cell.shown.name) : null;
      const partnerNames = cell.partner
        ? splitPlayerName(cell.partner.name)
        : null;
      const style = readComposerNameStyle();
      const lines = names
        ? composerNameLines(
            names.firstName,
            names.lastName || cell.shown?.name || "",
            style,
          )
        : partnerNames
          ? composerNameLines(
              partnerNames.firstName,
              partnerNames.lastName || cell.partner?.name || "",
              style,
            )
          : { given: "", family: "" };
      const given =
        cell.shown && cell.partner
          ? ""
          : lines.given;
      const family =
        cell.shown && cell.partner
          ? `${formatComposerName(names?.firstName || "", names?.lastName || cell.shown.name, style)} / ${formatComposerName(partnerNames?.firstName || "", partnerNames?.lastName || cell.partner.name, style)}`
          : lines.family ||
            cell.shown?.name ||
            cell.partner?.name ||
            "";
      const fadeH = size * 0.38;
      paintNameFadeRect(context, x, y + size - fadeH, size, fadeH);
      drawNameStack(
        context,
        given,
        family,
        x + size / 2,
        y + size - size * 0.06,
        size * 0.84,
        14 * scale,
        11 * scale,
        scale,
        "center",
      );
    }
  });

  if (input.showBa) {
    const ba = await loadImage("/ba-logo-circled.png");
    if (ba) {
      const size = 72 * scale;
      const inset = 42 * scale;
      if (input.purpleFlair) {
        paintPurpleBaGlow(context, width - inset - size, inset, size);
      }
      context.drawImage(ba, width - inset - size, inset, size, size);
    }
  }

  return canvas;
};
