import {
  clipToInnerFrame,
  paintCellFrame,
  paintPurpleBaGlow,
  paintPurplePlateEdge,
  type ComposerLook,
} from "../instagramComposer/composerLook";
import { getTeamColors } from "../lib/teamColors";
import {
  FIELD_TEXTURE_SRC,
  drawBannerInterior,
  paintBoardField,
} from "../standingsComposer/headerTexture";
import { drawCenteredLogo } from "../standingsComposer/logoDraw";
import {
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  STORY_DESIGN_HEIGHT,
} from "../standingsComposer/rankingState";
import { getTeam } from "../standingsComposer/teams";
import {
  clampPicksPlateOpacity,
  DEFAULT_PICKS_PLATE_OPACITY,
  effectivePicksResult,
  formatPicksLine,
  formatPicksTotal,
  PICKS_CHECK_FILL,
  PICKS_LOCK_FILL,
  PICKS_NOTCH_H,
  PICKS_PLATE_X,
  PICKS_PLATE_Y,
  PICKS_TITLE_PAD,
  picksTitlePlateH,
  PICKS_TITLE_SIZE,
  PICKS_TITLE_TRACK,
  picksFillLayout,
  picksJuiceOrMove,
  picksLineForSide,
  picksMl,
  picksRecordLine,
  picksDatePill,
  picksNameLabel,
  sortPicksGames,
  splitPicksTitle,
  visiblePicksGames,
  type PicksDraft,
  type PicksGame,
  type PicksResultMode,
  type PicksSide,
} from "./picksState";

const POSTER_FONT = "Montserrat, ui-sans-serif, system-ui, sans-serif";

const loadImage = (src: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image.naturalWidth > 0 ? image : null);
    image.onerror = () => resolve(null);
    image.src = src;
  });

export type PicksRenderInput = PicksDraft & {
  look?: ComposerLook;
  purpleFlair?: boolean;
  story?: boolean;
  footer?: string;
};

const hexAlpha = (hex: string, alpha: number) => {
  const token = hex.replace("#", "");
  if (token.length !== 6) {
    return `rgba(51, 65, 85, ${alpha})`;
  }
  const r = Number.parseInt(token.slice(0, 2), 16);
  const g = Number.parseInt(token.slice(2, 4), 16);
  const b = Number.parseInt(token.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const roundRectPath = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) => {
  const radius = Math.min(r, w / 2, h / 2);
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + w, y, x + w, y + h, radius);
  context.arcTo(x + w, y + h, x, y + h, radius);
  context.arcTo(x, y + h, x, y, radius);
  context.arcTo(x, y, x + w, y, radius);
  context.closePath();
};

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

const withShadow = (
  context: CanvasRenderingContext2D,
  scale: number,
  paint: () => void,
) => {
  context.save();
  context.shadowColor = "rgba(0, 0, 0, 0.82)";
  context.shadowOffsetX = Math.round(1.2 * scale);
  context.shadowOffsetY = Math.round(1.5 * scale);
  context.shadowBlur = 0;
  paint();
  context.restore();
};

const strokeFillText = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fill: string,
  stroke: string,
  strokeWidth: number,
) => {
  context.lineJoin = "round";
  context.miterLimit = 2;
  context.strokeStyle = stroke;
  context.lineWidth = strokeWidth;
  context.strokeText(text, x, y);
  context.fillStyle = fill;
  context.fillText(text, x, y);
};

const paintCheck = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  locked: boolean,
) => {
  context.save();
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `900 ${size}px ${POSTER_FONT}`;
  context.lineJoin = "round";
  context.miterLimit = 2;
  context.strokeStyle = locked ? "#3a2a00" : "#062a18";
  context.lineWidth = Math.max(1.5, size * 0.06);
  context.shadowColor = "rgba(0, 0, 0, 0.85)";
  context.shadowOffsetX = Math.max(1, size * 0.04);
  context.shadowOffsetY = Math.max(1, size * 0.045);
  context.shadowBlur = 0;
  context.fillStyle = locked ? PICKS_LOCK_FILL : PICKS_CHECK_FILL;
  const mark = locked ? "★" : "✓";
  context.strokeText(mark, x, y);
  context.fillText(mark, x, y);
  context.restore();
};

export const renderPicksCanvas = async (
  input: PicksRenderInput,
  scale = 2,
): Promise<HTMLCanvasElement> => {
  const width = GRAPHIC_WIDTH * scale;
  const boardH = input.story ? STORY_DESIGN_HEIGHT : GRAPHIC_HEIGHT;
  const height = boardH * scale;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    return canvas;
  }
  const s = scale;
  await document.fonts?.load(`italic 900 ${PICKS_TITLE_SIZE * s}px ${POSTER_FONT}`);
  paintBoardField(context, await loadImage(FIELD_TEXTURE_SRC), width, height);
  paintCellFrame(context, 0, 0, width, height, input.look, s);

  if (!input.showBa) {
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#fff";
    context.font = `900 ${22 * s}px ${POSTER_FONT}`;
    setLetterSpacing(context, 0.18 * 22 * s);
    withShadow(context, s, () => {
      context.fillText(input.brand.toUpperCase(), width / 2, 24 * s);
    });
    setLetterSpacing(context, 0);
  }

  const lines = splitPicksTitle(input.title, input.date);
  const plate = {
    x: PICKS_PLATE_X * s,
    y: PICKS_PLATE_Y * s,
    w: width - PICKS_PLATE_X * 2 * s,
    h: picksTitlePlateH(lines.length) * s,
  };
  drawBannerInterior(context, plate.x, plate.y, plate.w, plate.h, s, () => {
    context.beginPath();
    context.rect(plate.x, plate.y, plate.w, plate.h);
  });
  paintCellFrame(context, plate.x, plate.y, plate.w, plate.h, input.look, s);
  if (input.purpleFlair) {
    paintPurplePlateEdge(context, plate.x, plate.y, plate.w, plate.h, s);
  }

  const lineH = PICKS_TITLE_SIZE * 0.92 * s;
  const titleBlock = lineH * lines.length;
  let titleY = plate.y + (plate.h - titleBlock) / 2 + lineH / 2;
  context.save();
  const titleInner = clipToInnerFrame(
    context,
    plate.x,
    plate.y,
    plate.w,
    plate.h,
    s,
    input.look,
  );
  const titlePad = PICKS_TITLE_PAD * s;
  context.beginPath();
  context.rect(
    titleInner.x + titlePad,
    titleInner.y + titlePad,
    titleInner.w - titlePad * 2,
    titleInner.h - titlePad * 2,
  );
  context.clip();
  context.font = `italic 900 ${PICKS_TITLE_SIZE * s}px ${POSTER_FONT}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  setLetterSpacing(context, PICKS_TITLE_TRACK * PICKS_TITLE_SIZE * s);
  lines.forEach((line) => {
    withShadow(context, s, () => {
      strokeFillText(context, line, width / 2, titleY, "#fff", "#000", 3.2 * s);
    });
    titleY += lineH;
  });
  setLetterSpacing(context, 0);
  context.restore();

  const allGames = sortPicksGames(input.games);
  const games = visiblePicksGames(allGames, true);
  const mode: PicksResultMode = input.resultMode === "su" ? "su" : "ats";
  const pill = picksDatePill(games.length);
  context.font = `900 ${16 * s}px ${POSTER_FONT}`;
  setLetterSpacing(context, 0.04 * 16 * s);
  const weekW = Math.max(320 * s, context.measureText(pill).width + 64 * s);
  const weekH = PICKS_NOTCH_H * s;
  const weekX = (width - weekW) / 2;
  const weekY = plate.y + plate.h - 2 * s;
  context.fillStyle = "#fff";
  context.beginPath();
  context.moveTo(weekX + weekW * 0.08, weekY);
  context.lineTo(weekX + weekW * 0.92, weekY);
  context.lineTo(weekX + weekW, weekY + weekH);
  context.lineTo(weekX, weekY + weekH);
  context.closePath();
  context.fill();
  context.fillStyle = "#111";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(pill, width / 2, weekY + weekH / 2);
  setLetterSpacing(context, 0);

  const fill = picksFillLayout(games.length, boardH, 0, lines.length);
  const needed = new Set<string>();
  games.forEach((game) => {
    if (game.awayId) {
      needed.add(game.awayId);
    }
    if (game.homeId) {
      needed.add(game.homeId);
    }
  });
  const logos = new Map<string, HTMLImageElement | null>();
  await Promise.all(
    [...needed].map(async (id) => {
      const team = getTeam(id);
      logos.set(id, team ? await loadImage(team.logoSrc) : null);
    }),
  );

  const logo = fill.logo * s;
  const padX = 28 * s;
  const rowW = width - padX * 2;
  let cursorY = fill.listTop * s;

  const paintSide = (
    game: PicksGame,
    side: PicksSide,
    cx: number,
    midY: number,
  ) => {
    const teamId = side === "away" ? game.awayId : game.homeId;
    const pickedSide = game.pick === side;
    const size = logo;
    const image = logos.get(teamId);
    const markGap = fill.check * 0.72 * s;
    const logoCx =
      side === "away" ? cx - markGap / 2 : cx + markGap / 2;
    const logoY = midY - size / 2 - fill.name * 0.45 * s;
    if (image) {
      drawCenteredLogo(
        context,
        image,
        logoCx - size / 2,
        logoY,
        size,
        size,
        {
          cacheKey: `${teamId}-pk`,
          shadow: 0,
        },
      );
    }
    context.save();
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#fff";
    context.font = `900 ${fill.name * s}px ${POSTER_FONT}`;
    context.fillText(
      picksNameLabel(teamId, side),
      logoCx,
      midY + logo / 2 + fill.name * 0.15 * s,
    );
    const record = picksRecordLine(
      side === "away" ? game.awayRecord : game.homeRecord,
      side === "away" ? game.awayLast10 : game.homeLast10,
    );
    if (record) {
      context.font = `900 ${fill.meta * s}px ${POSTER_FONT}`;
      context.fillStyle = "rgba(255,255,255,0.7)";
      context.fillText(record, logoCx, midY + logo / 2 + fill.name * 1.15 * s);
    }
    if (input.showUnits && pickedSide) {
      context.fillStyle = "rgba(255,255,255,0.88)";
      context.font = `900 ${fill.meta * s}px ${POSTER_FONT}`;
      context.fillText(
        game.units || "1u",
        logoCx,
        midY + logo / 2 + fill.name * 2.05 * s,
      );
    }
    context.restore();
    if (pickedSide) {
      const markX =
        side === "away"
          ? logoCx + size / 2 + markGap * 0.55
          : logoCx - size / 2 - markGap * 0.55;
      paintCheck(
        context,
        markX,
        logoY + size / 2,
        fill.check * s,
        game.locked === true,
      );
    }
  };

  const paintTicket = (
    game: PicksGame,
    side: PicksSide,
    x: number,
    y: number,
  ) => {
    const teamId = side === "away" ? game.awayId : game.homeId;
    const line = formatPicksLine(picksLineForSide(game.line, side));
    const muted = Boolean(game.pick && game.pick !== side);
    context.save();
    context.globalAlpha = muted ? 0.4 : 1;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = muted ? "rgba(255,255,255,0.72)" : "#fff";
    const ml = input.showMoneyline ? picksMl(game, side) : "";
    const body = [teamId, line, ml].filter(Boolean).join(" ");
    context.font = `${muted ? 700 : 900} ${fill.line * s}px ${POSTER_FONT}`;
    context.fillText(body || "—", x, y);
    const juice = input.showJuice ? picksJuiceOrMove(game, side) : "";
    if (juice) {
      context.font = `900 ${fill.meta * s}px ${POSTER_FONT}`;
      context.fillStyle = "rgba(255,255,255,0.7)";
      context.fillText(juice, x, y + fill.line * 0.62 * s);
    }
    context.restore();
  };

  const paintRow = (game: PicksGame, y: number) => {
    const rowH = fill.rowH * s;
    const x = padX;
    const awayColor = getTeamColors(game.awayId).primary;
    const homeColor = getTeamColors(game.homeId).primary;
    const opacity =
      clampPicksPlateOpacity(
        input.plateOpacity ?? DEFAULT_PICKS_PLATE_OPACITY,
      ) / 100;
    const gradient = context.createLinearGradient(x, y, x + rowW, y);
    gradient.addColorStop(0, hexAlpha(awayColor, 0.28 * opacity));
    gradient.addColorStop(0.12, hexAlpha(awayColor, 0.16 * opacity));
    gradient.addColorStop(0.22, `rgba(22,22,22,${opacity})`);
    gradient.addColorStop(0.78, `rgba(22,22,22,${opacity})`);
    gradient.addColorStop(0.88, hexAlpha(homeColor, 0.16 * opacity));
    gradient.addColorStop(1, hexAlpha(homeColor, 0.28 * opacity));
    roundRectPath(context, x, y, rowW, rowH, 2 * s);
    context.fillStyle = `rgba(22,22,22,${opacity})`;
    context.fill();
    context.fillStyle = gradient;
    context.fill();
    context.strokeStyle = "rgba(255,255,255,0.14)";
    context.lineWidth = Math.max(1, s);
    context.stroke();

    const midY = y + rowH / 2;
    const leftLogoX = x + 18 * s + logo / 2;
    const rightLogoX = x + rowW - 18 * s - logo / 2;
    paintSide(game, "away", leftLogoX, midY);
    paintSide(game, "home", rightLogoX, midY);

    const midX = width / 2;
    const ticketY = midY - (game.tip || game.tv || input.showTotal ? 8 * s : 0);
    paintTicket(game, "away", midX - 92 * s, ticketY);
    context.save();
    context.fillStyle = "rgba(255,255,255,0.28)";
    context.fillRect(midX - 0.5 * s, ticketY - fill.line * 0.42 * s, Math.max(1, s), fill.line * 0.84 * s);
    context.restore();
    paintTicket(game, "home", midX + 92 * s, ticketY);

    const stamp = game.pick ? effectivePicksResult(game, mode) : null;
    if (stamp) {
      context.save();
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.font = `900 ${11 * s}px ${POSTER_FONT}`;
      context.fillStyle =
        stamp === "W" ? "#7dffb2" : stamp === "L" ? "#ff8d8d" : "#f4d35e";
      context.strokeStyle = context.fillStyle;
      context.lineWidth = Math.max(1, 1.2 * s);
      const stampW = 22 * s;
      const stampH = 16 * s;
      const stampX = midX - stampW / 2;
      const stampY = ticketY - fill.line * 0.95 * s;
      roundRectPath(context, stampX, stampY, stampW, stampH, 3 * s);
      context.stroke();
      context.fillText(stamp, midX, stampY + stampH / 2);
      context.restore();
    }

    let metaY = ticketY + fill.line * 0.9 * s;
    if (input.showTotal) {
      const total = formatPicksTotal(game.total);
      if (total) {
        context.fillStyle = "rgba(255,255,255,0.72)";
        context.font = `900 ${fill.meta * s}px ${POSTER_FONT}`;
        context.fillText(total, midX, metaY);
        metaY += fill.meta * 1.15 * s;
      }
    }
    const tipBits = [game.tip, game.tv].filter(Boolean);
    if (tipBits.length) {
      context.fillStyle = "rgba(255,255,255,0.72)";
      context.font = `900 ${fill.meta * s}px ${POSTER_FONT}`;
      context.textAlign = "center";
      context.fillText(tipBits.join("   "), midX, metaY);
    }
    if (game.notes) {
      context.fillStyle = "rgba(255,255,255,0.7)";
      context.font = `700 ${9 * s}px ${POSTER_FONT}`;
      context.textAlign = "center";
      context.fillText(game.notes.toUpperCase(), midX, y + rowH - 8 * s);
    }
    if (input.showConfidence && game.pick) {
      const ticks = Math.max(1, Math.min(3, game.confidence || 1));
      context.fillStyle = PICKS_LOCK_FILL;
      context.font = `900 ${10 * s}px ${POSTER_FONT}`;
      context.textAlign = "right";
      context.fillText(
        `${"●".repeat(ticks)}${"○".repeat(3 - ticks)}`,
        x + rowW - 12 * s,
        y + 12 * s,
      );
    }
  };

  games.forEach((game) => {
    paintRow(game, cursorY);
    cursorY += (fill.rowH + fill.gap) * s;
  });

  if (input.showBa) {
    const ba = await loadImage("/ba-logo-circled.png");
    if (ba) {
      const size = 56 * s;
      const inset = 24 * s;
      if (input.purpleFlair) {
        paintPurpleBaGlow(context, width - inset - size, inset, size);
      }
      context.drawImage(ba, width - inset - size, inset, size, size);
    }
  }
  return canvas;
};
