import { isShareDismissalError } from "./appErrors";
import { formatUsername } from "./accountCredentials";
import { getActiveChemistryBonuses, type ActiveChemistryBonus } from "./chemistry";
import {
  getJerseyNumberFontSize,
  JERSEY_COLLAR_PATH,
  JERSEY_NUMBER_ZONE,
  JERSEY_SILHOUETTE_PATH,
  JERSEY_VIEWBOX_SIZE,
} from "./jerseySilhouette";
import { assignLineupSlots } from "./lineupOrder";
import {
  drawCircularPlayerHeadshot,
  loadPlayerHeadshotImages,
} from "./playerHeadshots";
import { getTeamColors, type TeamColors } from "./teamColors";
import type { Player, Position } from "./types";

export interface LineupShareCardInput {
  teamName: string;
  accent: string;
  ovr: number;
  ovrOverflow?: number;
  lineup: Player[];
  /** Linked account handle shown under the title when present. */
  username?: string;
  /** Small uppercase label above the title (defaults to "DRAFT DAY GM"). */
  eyebrow?: string;
  /** Optional muted context drawn under the title. */
  subhead?: string;
  /** Optional right-side footer context (defaults to "DRAFT DAY GM"). */
  footerNote?: string;
  record?: string;
  /** Prefix drawn before `record` (defaults to "Projected"). */
  recordLabel?: string;
  /** When set, replaces the large left title (defaults to teamName). */
  headline?: string;
  /** When set with statValue, replaces the "OVR" label. */
  statLabel?: string;
  /** When set, replaces the OVR number on the right. */
  statValue?: string;
}

export const resolveShareCardTitle = (input: LineupShareCardInput) => {
  const headline = input.headline?.trim();
  return headline || input.teamName;
};

export const resolveShareCardUsername = (input: LineupShareCardInput) => {
  const handle = input.username?.trim();
  return handle ? formatUsername(handle) : null;
};

export const resolveShareCardStatDisplay = (input: LineupShareCardInput) => {
  const customValue = input.statValue?.trim();
  if (customValue) {
    return {
      custom: true as const,
      value: customValue,
      label: input.statLabel?.trim() || "RESULT",
    };
  }

  const overflow = Math.max(0, Math.round(input.ovrOverflow ?? 0));
  return {
    custom: false as const,
    value: overflow > 0 ? `${input.ovr} (+${overflow})` : String(input.ovr),
    label: "OVR",
    overflow,
  };
};

export const formatShareCardPlayerMeta = (
  player: Player,
  slot: Position,
  index: number,
) => {
  const jerseyNumber = String(player.jerseyNumber || index + 1);
  return `${slot} · ${player.team} · #${jerseyNumber}`;
};

const CARD_WIDTH = 1080;
const ROW_STEP = 118;
const ROW_HEIGHT = 104;
const FOOTER_GAP = 36;
const FOOTER_BOTTOM = 64;
const FONT_STACK =
  'Montserrat, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const HEADER_X = 88;
const HEADER_RIGHT_X = CARD_WIDTH - 88;
const TITLE_MAX_WIDTH = 620;
const HEADER_TO_PLAYERS_GAP = 36;
const CHEMISTRY_PILL_HEIGHT = 26;
const CHEMISTRY_ROW_GAP = 8;
const CHEMISTRY_BLOCK_GAP = 12;
const CHEMISTRY_FONT = `700 14px ${FONT_STACK}`;

let fontsReady: Promise<void> | null = null;

const roundRect = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) => {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
};

const hexToRgb = (hex: string) => {
  const normalized = hex.replace("#", "");

  if (normalized.length !== 6) {
    return { r: 51, g: 65, b: 85 };
  }

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
};

const rgbaFromHex = (hex: string, alpha: number) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const fitTextToWidth = (
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) => {
  if (context.measureText(text).width <= maxWidth) {
    return text;
  }

  const ellipsis = "…";
  let low = 0;
  let high = text.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    const candidate = `${text.slice(0, mid).trimEnd()}${ellipsis}`;
    if (context.measureText(candidate).width <= maxWidth) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }

  return low > 0 ? `${text.slice(0, low).trimEnd()}${ellipsis}` : ellipsis;
};

/** Deterministic grain so share images are stable across redraws. */
const mulberry32 = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let next = state;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
};

const hashSeed = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export const ensureShareCardFonts = () => {
  if (typeof document === "undefined") {
    return Promise.resolve();
  }

  fontsReady ??= Promise.all([
    document.fonts.load(`500 24px ${FONT_STACK}`),
    document.fonts.load(`600 24px ${FONT_STACK}`),
    document.fonts.load(`700 30px ${FONT_STACK}`),
    document.fonts.load(`800 54px ${FONT_STACK}`),
    document.fonts.load(`900 22px ${FONT_STACK}`),
    document.fonts.load(`700 14px ${FONT_STACK}`),
    document.fonts.load(`900 72px ${FONT_STACK}`),
  ]).then(() => undefined);

  return fontsReady;
};

const drawJerseyBadge = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  number: string,
  colors: TeamColors,
) => {
  const scale = size / JERSEY_VIEWBOX_SIZE;
  const jerseyPath = new Path2D(JERSEY_SILHOUETTE_PATH);
  const collarPath = new Path2D(JERSEY_COLLAR_PATH);

  context.save();
  context.translate(x, y);
  context.scale(scale, scale);

  context.shadowColor = rgbaFromHex(colors.primary, 0.28);
  context.shadowBlur = 8;
  context.fillStyle = colors.primary;
  context.fill(jerseyPath, "evenodd");

  context.shadowBlur = 0;
  context.strokeStyle = rgbaFromHex(colors.secondary, 0.55);
  context.lineWidth = 1.35;
  context.lineJoin = "round";
  context.stroke(jerseyPath);

  context.strokeStyle = rgbaFromHex(colors.secondary, 0.7);
  context.lineWidth = 0.85;
  context.lineCap = "round";
  context.stroke(collarPath);

  const fontSize = getJerseyNumberFontSize(number);
  context.font = `800 ${fontSize}px ${FONT_STACK}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineWidth = 0.85;
  context.strokeStyle = "rgba(8,8,10,0.45)";
  context.fillStyle = "#f8fafc";
  const numberX = JERSEY_NUMBER_ZONE.centerX;
  const numberY = JERSEY_NUMBER_ZONE.centerY;
  const maxWidth = JERSEY_NUMBER_ZONE.width - 1;
  const measured = context.measureText(number).width;
  if (measured > maxWidth && measured > 0) {
    context.save();
    context.translate(numberX, numberY);
    context.scale(maxWidth / measured, 1);
    context.strokeText(number, 0, 0);
    context.fillText(number, 0, 0);
    context.restore();
  } else {
    context.strokeText(number, numberX, numberY);
    context.fillText(number, numberX, numberY);
  }

  context.restore();
};

const drawTexturedBackground = (
  context: CanvasRenderingContext2D,
  cardHeight: number,
  seedKey: string,
) => {
  const random = mulberry32(hashSeed(seedKey));
  const baseGradient = context.createLinearGradient(0, 0, CARD_WIDTH, cardHeight);
  baseGradient.addColorStop(0, "#121722");
  baseGradient.addColorStop(0.5, "#0b0d11");
  baseGradient.addColorStop(1, "#0c1018");
  context.fillStyle = baseGradient;
  context.fillRect(0, 0, CARD_WIDTH, cardHeight);

  context.strokeStyle = "rgba(226,232,240,0.03)";
  context.lineWidth = 1;

  for (let offset = -cardHeight; offset < CARD_WIDTH + cardHeight; offset += 36) {
    context.beginPath();
    context.moveTo(offset, 0);
    context.lineTo(offset + cardHeight, cardHeight);
    context.stroke();
  }

  for (let index = 0; index < 2800; index += 1) {
    const x = random() * CARD_WIDTH;
    const y = random() * cardHeight;
    const alpha = random() * 0.035;
    context.fillStyle = `rgba(255,255,255,${alpha})`;
    context.fillRect(x, y, 1, 1);
  }

  const vignette = context.createRadialGradient(
    CARD_WIDTH / 2,
    cardHeight * 0.38,
    140,
    CARD_WIDTH / 2,
    cardHeight * 0.42,
    CARD_WIDTH * 0.82,
  );
  vignette.addColorStop(0, "rgba(255,255,255,0.02)");
  vignette.addColorStop(1, "rgba(0,0,0,0.42)");
  context.fillStyle = vignette;
  context.fillRect(0, 0, CARD_WIDTH, cardHeight);
};

const drawPlayerRow = (
  context: CanvasRenderingContext2D,
  player: Player,
  slot: Position,
  index: number,
  y: number,
  accent: string,
  headshot?: HTMLImageElement | null,
) => {
  const colors = getTeamColors(player.team);
  const rowX = 72;
  const rowWidth = CARD_WIDTH - 144;
  const rowHeight = 104;
  const jerseyNumber = String(player.jerseyNumber || index + 1);
  const accentColor = colors.primary || accent;

  roundRect(context, rowX, y, rowWidth, rowHeight, 18);
  const rowGradient = context.createLinearGradient(rowX, y, rowX, y + rowHeight);
  rowGradient.addColorStop(0, "#1a2030");
  rowGradient.addColorStop(1, "#12151a");
  context.fillStyle = rowGradient;
  context.fill();

  const wash = context.createLinearGradient(rowX, y, rowX + rowWidth * 0.55, y);
  wash.addColorStop(0, rgbaFromHex(accentColor, 0.18));
  wash.addColorStop(0.55, rgbaFromHex(accentColor, 0.05));
  wash.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = wash;
  context.fill();

  context.strokeStyle = "rgba(226,232,240,0.12)";
  context.lineWidth = 1.25;
  context.stroke();

  context.fillStyle = rgbaFromHex(accentColor, 0.85);
  context.fillRect(rowX, y + 14, 3, rowHeight - 28);

  if (headshot) {
    drawCircularPlayerHeadshot(
      context,
      headshot,
      rowX + 20,
      y + 14,
      76,
      rgbaFromHex(accentColor, 0.45),
    );
  } else {
    drawJerseyBadge(context, rowX + 12, y + 4, 96, jerseyNumber, colors);
  }

  context.shadowBlur = 0;
  context.fillStyle = "#f8fafc";
  context.font = `700 28px ${FONT_STACK}`;
  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  context.fillText(
    fitTextToWidth(context, player.name, rowWidth - 170),
    214,
    y + 46,
  );

  context.fillStyle = "rgba(203, 213, 225, 0.88)";
  context.font = `500 20px ${FONT_STACK}`;
  context.fillText(
    formatShareCardPlayerMeta(player, slot, index),
    214,
    y + 76,
  );
};

const getChemistryPillLabel = (bonus: ActiveChemistryBonus) =>
  `${bonus.title} +${bonus.bonus}`;

const layoutChemistryPillRows = (
  context: CanvasRenderingContext2D,
  bonuses: ActiveChemistryBonus[],
  maxWidth: number,
) => {
  if (bonuses.length === 0) {
    return [] as string[][];
  }

  context.font = CHEMISTRY_FONT;
  const rows: string[][] = [[]];
  let rowWidth = 0;

  for (const bonus of bonuses) {
    const label = getChemistryPillLabel(bonus);
    const pillWidth = context.measureText(label).width + 20;

    if (rowWidth > 0 && rowWidth + pillWidth > maxWidth) {
      rows.push([]);
      rowWidth = 0;
    }

    rows[rows.length - 1].push(label);
    rowWidth += pillWidth + CHEMISTRY_ROW_GAP;
  }

  return rows;
};

const getShareCardHeaderLayout = (
  context: CanvasRenderingContext2D,
  input: LineupShareCardInput,
  lineup: Player[],
) => {
  const bonuses = getActiveChemistryBonuses(lineup);
  const stat = resolveShareCardStatDisplay(input);
  const username = resolveShareCardUsername(input);
  const subhead = input.subhead?.trim() || null;

  const eyebrowY = 98;
  const titleY = 160;
  let leftCursor = titleY;
  const usernameY = username ? ((leftCursor += 30), leftCursor) : null;
  const subheadY = subhead ? ((leftCursor += username ? 28 : 32), leftCursor) : null;
  const startingFiveY = leftCursor + 36;
  const dividerY = startingFiveY + 14;

  const ovrY = 160;
  const ovrLabelY = ovrY + (stat.custom ? 28 : 30);
  const recordY =
    !stat.custom && input.record ? ovrLabelY + 30 : null;
  const rightBottom = recordY ? recordY + 10 : ovrLabelY + 10;
  const leftBottom = dividerY + 8;
  const chemistryRows = layoutChemistryPillRows(
    context,
    bonuses,
    CARD_WIDTH - 176,
  );
  const chemistryHeight =
    chemistryRows.length > 0
      ? CHEMISTRY_BLOCK_GAP +
        chemistryRows.length * CHEMISTRY_PILL_HEIGHT +
        Math.max(0, chemistryRows.length - 1) * CHEMISTRY_ROW_GAP
      : 0;
  const chemistryRowY = dividerY + CHEMISTRY_BLOCK_GAP;
  const headerBottom = Math.max(
    leftBottom,
    rightBottom,
    chemistryRowY + chemistryHeight,
  );
  const firstPlayerY = headerBottom + HEADER_TO_PLAYERS_GAP;

  return {
    bonuses,
    chemistryRowY,
    chemistryRows,
    dividerY,
    eyebrowY,
    firstPlayerY,
    ovrLabelY,
    ovrY,
    recordY,
    startingFiveY,
    stat,
    subhead,
    subheadY,
    titleY,
    username,
    usernameY,
  };
};

const drawChemistryBonusRow = (
  context: CanvasRenderingContext2D,
  labels: string[],
  y: number,
  accent: string,
) => {
  let x = 88;
  const maxX = CARD_WIDTH - 88;

  context.font = CHEMISTRY_FONT;
  context.textBaseline = "middle";

  for (const label of labels) {
    const textWidth = context.measureText(label).width;
    const pillWidth = textWidth + 20;

    if (x + pillWidth > maxX && x > 88) {
      break;
    }

    roundRect(context, x, y, pillWidth, CHEMISTRY_PILL_HEIGHT, 13);
    context.fillStyle = rgbaFromHex(accent, 0.1);
    context.fill();
    context.strokeStyle = rgbaFromHex(accent, 0.28);
    context.lineWidth = 1;
    context.stroke();

    context.fillStyle = "#cbd5e1";
    context.textAlign = "left";
    context.fillText(label, x + 10, y + CHEMISTRY_PILL_HEIGHT / 2);

    x += pillWidth + CHEMISTRY_ROW_GAP;
  }
};

const drawShareCardHeader = (
  context: CanvasRenderingContext2D,
  input: LineupShareCardInput,
  layout: ReturnType<typeof getShareCardHeaderLayout>,
) => {
  context.textBaseline = "alphabetic";

  context.textAlign = "left";
  context.font = `700 20px ${FONT_STACK}`;
  context.fillStyle = "#67e8f9";
  context.letterSpacing = "3.2px";
  context.fillText(
    input.eyebrow?.trim() || "DRAFT DAY GM",
    HEADER_X,
    layout.eyebrowY,
  );
  context.letterSpacing = "0px";

  context.font = `700 52px ${FONT_STACK}`;
  context.fillStyle = "#f8fafc";
  const title = fitTextToWidth(
    context,
    resolveShareCardTitle(input),
    TITLE_MAX_WIDTH,
  );
  context.fillText(title, HEADER_X, layout.titleY);

  if (layout.username && layout.usernameY != null) {
    context.font = `600 22px ${FONT_STACK}`;
    context.fillStyle = "rgba(125, 211, 252, 0.95)";
    context.fillText(layout.username, HEADER_X, layout.usernameY);
  }

  if (layout.subhead && layout.subheadY != null) {
    context.font = `600 21px ${FONT_STACK}`;
    context.fillStyle = "rgba(203, 213, 225, 0.88)";
    context.fillText(
      fitTextToWidth(context, layout.subhead, TITLE_MAX_WIDTH),
      HEADER_X,
      layout.subheadY,
    );
  }

  context.font = `700 18px ${FONT_STACK}`;
  context.fillStyle = "rgba(148, 163, 184, 0.9)";
  context.letterSpacing = "2.4px";
  context.fillText("STARTING FIVE", HEADER_X, layout.startingFiveY);
  context.letterSpacing = "0px";

  context.strokeStyle = "rgba(148, 163, 184, 0.22)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(HEADER_X, layout.dividerY);
  context.lineTo(HEADER_RIGHT_X, layout.dividerY);
  context.stroke();

  context.textAlign = "right";

  const { stat } = layout;
  context.save();
  context.shadowColor = rgbaFromHex(input.accent, 0.22);
  context.shadowBlur = 10;
  const valueFontSize = stat.custom
    ? Math.min(48, Math.max(28, 56 - Math.max(0, stat.value.length - 8) * 2))
    : !stat.custom && stat.overflow > 0
      ? 50
      : 68;
  context.font = `800 ${valueFontSize}px ${FONT_STACK}`;
  context.fillStyle = "#f8fafc";
  context.fillText(stat.value, HEADER_RIGHT_X, layout.ovrY);
  context.restore();

  context.font = `600 ${stat.custom ? 18 : 20}px ${FONT_STACK}`;
  context.fillStyle = "#94a3b8";
  context.fillText(stat.label, HEADER_RIGHT_X, layout.ovrLabelY);

  if (!stat.custom && input.record && layout.recordY) {
    context.font = `600 20px ${FONT_STACK}`;
    context.fillStyle = "#94a3b8";
    const recordLabel = input.recordLabel?.trim() || "Projected";
    context.fillText(
      `${recordLabel} ${input.record}`,
      HEADER_RIGHT_X,
      layout.recordY,
    );
  }

  if (layout.chemistryRows.length > 0) {
    layout.chemistryRows.forEach((row, index) => {
      drawChemistryBonusRow(
        context,
        row,
        layout.chemistryRowY +
          index * (CHEMISTRY_PILL_HEIGHT + CHEMISTRY_ROW_GAP),
        input.accent,
      );
    });
  }

  context.textAlign = "left";
};

const computeShareCardLayout = (
  context: CanvasRenderingContext2D,
  input: LineupShareCardInput,
  lineup: Player[],
) => {
  const headerLayout = getShareCardHeaderLayout(context, input, lineup);
  const lastPlayerBottom =
    headerLayout.firstPlayerY +
    Math.max(0, lineup.length - 1) * ROW_STEP +
    ROW_HEIGHT;
  const footerY = lastPlayerBottom + FOOTER_GAP;

  return {
    cardHeight: footerY + FOOTER_BOTTOM,
    footerY,
    headerLayout,
  };
};

export const drawLineupShareCard = (
  canvas: HTMLCanvasElement,
  input: LineupShareCardInput,
  headshots: Map<string, HTMLImageElement> = new Map(),
) => {
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Could not create share card canvas context.");
  }

  const slotted = assignLineupSlots(input.lineup);
  const lineup = slotted.map((entry) => entry.player);
  const { cardHeight, footerY, headerLayout } = computeShareCardLayout(
    context,
    input,
    lineup,
  );

  canvas.width = CARD_WIDTH;
  canvas.height = cardHeight;

  const seedKey = [
    resolveShareCardTitle(input),
    input.username?.trim() ?? "",
    String(input.ovr),
    lineup.map((player) => player.id).join(","),
  ].join("|");
  drawTexturedBackground(context, cardHeight, seedKey);

  context.strokeStyle = rgbaFromHex(input.accent, 0.28);
  context.lineWidth = 1.5;
  roundRect(context, 40, 40, CARD_WIDTH - 80, cardHeight - 80, 28);
  context.stroke();

  context.save();
  roundRect(context, 40, 40, CARD_WIDTH - 80, cardHeight - 80, 28);
  context.clip();
  context.fillStyle = rgbaFromHex(input.accent, 0.9);
  context.fillRect(40, 40, CARD_WIDTH - 80, 6);
  context.restore();

  drawShareCardHeader(context, input, headerLayout);

  slotted.forEach((entry, index) => {
    const headshot = entry.player.bbrPlayerId
      ? headshots.get(entry.player.bbrPlayerId)
      : undefined;
    drawPlayerRow(
      context,
      entry.player,
      entry.slot,
      index,
      headerLayout.firstPlayerY + index * ROW_STEP,
      input.accent,
      headshot,
    );
  });

  context.fillStyle = "#94a3b8";
  context.font = `600 18px ${FONT_STACK}`;
  context.textAlign = "left";
  context.fillText("#DraftDayGM", 88, footerY);
  context.textAlign = "right";
  context.fillText(
    input.footerNote?.trim() || "DRAFT DAY GM",
    CARD_WIDTH - 88,
    footerY,
  );
  context.textAlign = "left";
};

export const createLineupShareCardBlob = async (input: LineupShareCardInput) => {
  await ensureShareCardFonts();

  const headshots = await loadPlayerHeadshotImages(
    input.lineup.map((player) => player.bbrPlayerId),
  );

  const canvas = document.createElement("canvas");
  drawLineupShareCard(canvas, input, headshots);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Could not create share image."));
        return;
      }

      resolve(blob);
    }, "image/png");
  });
};

const canvasToBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Could not create share image."));
        return;
      }
      resolve(blob);
    }, "image/png");
  });

/** Stack two lineup cards into one matchup image (your five + theirs). */
export const createMatchupShareCardBlob = async (inputs: {
  user: LineupShareCardInput;
  opponent: LineupShareCardInput;
}) => {
  await ensureShareCardFonts();

  const allBbrIds = [
    ...inputs.user.lineup.map((player) => player.bbrPlayerId),
    ...inputs.opponent.lineup.map((player) => player.bbrPlayerId),
  ];
  const headshots = await loadPlayerHeadshotImages(allBbrIds);

  const userCanvas = document.createElement("canvas");
  const opponentCanvas = document.createElement("canvas");
  drawLineupShareCard(userCanvas, inputs.user, headshots);
  drawLineupShareCard(opponentCanvas, inputs.opponent, headshots);

  const gap = 28;
  const combined = document.createElement("canvas");
  combined.width = CARD_WIDTH;
  combined.height = userCanvas.height + gap + opponentCanvas.height;
  const context = combined.getContext("2d");
  if (!context) {
    throw new Error("Could not create matchup share card canvas context.");
  }

  drawTexturedBackground(
    context,
    combined.height,
    `${resolveShareCardTitle(inputs.user)}|${resolveShareCardTitle(inputs.opponent)}`,
  );
  context.drawImage(userCanvas, 0, 0);
  context.drawImage(opponentCanvas, 0, userCanvas.height + gap);

  return canvasToBlob(combined);
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const buildLineupShareCardText = (input: LineupShareCardInput) => {
  const title = resolveShareCardTitle(input);
  const username = resolveShareCardUsername(input);
  const stat = resolveShareCardStatDisplay(input);
  const identity = username ? `${title} (${username})` : title;
  if (stat.custom) {
    return `${identity} • ${stat.value} · ${stat.label}`;
  }
  return `${identity} • ${stat.label} ${stat.value}`;
};

export const saveLineupShareCard = async (input: LineupShareCardInput) => {
  const blob = await createLineupShareCardBlob(input);
  const filename = "draft-day-gm-lineup.png";
  const file = new File([blob], filename, { type: "image/png" });
  const shareText = buildLineupShareCardText(input);

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        title: "Draft Day GM Lineup",
        text: shareText,
        files: [file],
      });
    } catch (error) {
      if (isShareDismissalError(error)) {
        return;
      }
      throw error;
    }
    return;
  }

  downloadBlob(blob, filename);
};
