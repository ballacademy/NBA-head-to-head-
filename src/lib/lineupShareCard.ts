import { getActiveChemistryBonuses, type ActiveChemistryBonus } from "./chemistry";
import {
  getJerseyNumberFontSize,
  JERSEY_COLLAR_PATH,
  JERSEY_NUMBER_ZONE,
  JERSEY_SILHOUETTE_PATH,
  JERSEY_VIEWBOX_SIZE,
} from "./jerseySilhouette";
import { sortLineupByPosition } from "./lineupOrder";
import { getTeamColors, type TeamColors } from "./teamColors";
import type { Player } from "./types";

export interface LineupShareCardInput {
  teamName: string;
  accent: string;
  ovr: number;
  lineup: Player[];
  record?: string;
}

const CARD_WIDTH = 1080;
const ROW_STEP = 118;
const ROW_HEIGHT = 104;
const FOOTER_GAP = 36;
const FOOTER_BOTTOM = 64;
const FONT_STACK =
  'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const STARTING_FIVE_Y = 220;
const HEADER_TO_PLAYERS_GAP = 40;
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

  context.shadowColor = rgbaFromHex(colors.primary, 0.85);
  context.shadowBlur = 14;
  context.fillStyle = colors.primary;
  context.fill(jerseyPath, "evenodd");

  context.shadowBlur = 8;
  context.shadowColor = rgbaFromHex(colors.secondary, 0.75);
  context.strokeStyle = colors.secondary;
  context.lineWidth = 1.5;
  context.lineJoin = "round";
  context.stroke(jerseyPath);

  context.shadowBlur = 0;
  context.strokeStyle = rgbaFromHex(colors.secondary, 0.85);
  context.lineWidth = 0.85;
  context.lineCap = "round";
  context.stroke(collarPath);

  const fontSize = getJerseyNumberFontSize(number);
  context.font = `900 ${fontSize}px "Arial Black", "Helvetica Neue", ${FONT_STACK}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineWidth = 0.9;
  context.strokeStyle = "rgba(8,8,10,0.55)";
  context.fillStyle = "#ffffff";
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
) => {
  const baseGradient = context.createLinearGradient(0, 0, CARD_WIDTH, cardHeight);
  baseGradient.addColorStop(0, "#0b0b0d");
  baseGradient.addColorStop(0.55, "#08080a");
  baseGradient.addColorStop(1, "#111114");
  context.fillStyle = baseGradient;
  context.fillRect(0, 0, CARD_WIDTH, cardHeight);

  context.strokeStyle = "rgba(255,255,255,0.018)";
  context.lineWidth = 1;

  for (let offset = -cardHeight; offset < CARD_WIDTH + cardHeight; offset += 28) {
    context.beginPath();
    context.moveTo(offset, 0);
    context.lineTo(offset + cardHeight, cardHeight);
    context.stroke();
  }

  for (let index = 0; index < 5200; index += 1) {
    const x = Math.random() * CARD_WIDTH;
    const y = Math.random() * cardHeight;
    const alpha = Math.random() * 0.05;
    context.fillStyle = `rgba(255,255,255,${alpha})`;
    context.fillRect(x, y, 1, 1);
  }

  const vignette = context.createRadialGradient(
    CARD_WIDTH / 2,
    cardHeight * 0.42,
    120,
    CARD_WIDTH / 2,
    cardHeight * 0.42,
    CARD_WIDTH * 0.78,
  );
  vignette.addColorStop(0, "rgba(255,255,255,0.03)");
  vignette.addColorStop(1, "rgba(0,0,0,0.55)");
  context.fillStyle = vignette;
  context.fillRect(0, 0, CARD_WIDTH, cardHeight);
};

const drawPlayerRow = (
  context: CanvasRenderingContext2D,
  player: Player,
  index: number,
  y: number,
) => {
  const colors = getTeamColors(player.team);
  const rowX = 72;
  const rowWidth = CARD_WIDTH - 144;
  const rowHeight = 104;
  const jerseyNumber = String(player.jerseyNumber || index + 1);

  context.save();
  context.shadowColor = rgbaFromHex(colors.primary, 0.7);
  context.shadowBlur = 22;
  roundRect(context, rowX, y, rowWidth, rowHeight, 20);
  context.strokeStyle = rgbaFromHex(colors.primary, 0.95);
  context.lineWidth = 2;
  context.stroke();
  context.restore();

  roundRect(context, rowX, y, rowWidth, rowHeight, 20);
  const rowGradient = context.createLinearGradient(rowX, y, rowX + rowWidth, y + rowHeight);
  rowGradient.addColorStop(0, colors.primary);
  rowGradient.addColorStop(0.55, rgbaFromHex(colors.primary, 0.92));
  rowGradient.addColorStop(1, colors.secondary);
  context.fillStyle = rowGradient;
  context.fill();

  context.save();
  context.shadowColor = rgbaFromHex(colors.secondary, 0.45);
  context.shadowBlur = 10;
  context.strokeStyle = rgbaFromHex(colors.secondary, 0.85);
  context.lineWidth = 2;
  context.stroke();
  context.restore();

  drawJerseyBadge(context, rowX + 10, y + 2, 100, jerseyNumber, colors);

  context.fillStyle = "#ffffff";
  context.font = `700 30px ${FONT_STACK}`;
  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  context.shadowColor = "rgba(0, 0, 0, 0.45)";
  context.shadowBlur = 8;
  context.fillText(player.name, 210, y + 46);
  context.shadowBlur = 0;

  context.fillStyle = "rgba(255, 255, 255, 0.88)";
  context.font = `500 22px ${FONT_STACK}`;
  context.fillText(
    `${player.position} • ${player.team} • ${player.points.toFixed(1)} PTS`,
    210,
    y + 78,
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
  const ovrY = 168;
  const ovrLabelY = ovrY + 30;
  const recordY = input.record ? ovrLabelY + 30 : null;
  const rightBottom = recordY ? recordY + 10 : ovrLabelY + 10;
  const leftBottom = STARTING_FIVE_Y + 12;
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
  const chemistryRowY = STARTING_FIVE_Y + CHEMISTRY_BLOCK_GAP;
  const headerBottom = Math.max(leftBottom, rightBottom, chemistryRowY + chemistryHeight);
  const firstPlayerY = headerBottom + HEADER_TO_PLAYERS_GAP;

  return {
    bonuses,
    chemistryRowY,
    chemistryRows,
    firstPlayerY,
    ovrLabelY,
    ovrY,
    recordY,
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
    context.fillStyle = rgbaFromHex(accent, 0.14);
    context.fill();
    context.strokeStyle = rgbaFromHex(accent, 0.34);
    context.lineWidth = 1;
    context.stroke();

    context.fillStyle = "#d1fae5";
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
  const headerX = 88;
  const headerRightX = CARD_WIDTH - 88;

  context.textBaseline = "alphabetic";

  context.textAlign = "left";
  context.font = `900 22px ${FONT_STACK}`;
  context.fillStyle = "#fb923c";
  context.letterSpacing = "3.6px";
  context.fillText("DRAFT DAY GM", headerX, 98);
  context.letterSpacing = "0px";

  context.font = `800 54px ${FONT_STACK}`;
  context.fillStyle = "#f8fafc";
  context.fillText(input.teamName, headerX, 168);

  context.font = `900 20px ${FONT_STACK}`;
  context.fillStyle = "rgba(148, 163, 184, 0.92)";
  context.letterSpacing = "2.8px";
  context.fillText("STARTING FIVE", headerX, STARTING_FIVE_Y);
  context.letterSpacing = "0px";

  context.textAlign = "right";

  context.save();
  context.shadowColor = rgbaFromHex(input.accent, 0.45);
  context.shadowBlur = 16;
  context.font = `900 72px ${FONT_STACK}`;
  context.fillStyle = "#ffffff";
  context.fillText(String(input.ovr), headerRightX, layout.ovrY);
  context.restore();

  context.font = `700 22px ${FONT_STACK}`;
  context.fillStyle = "#94a3b8";
  context.fillText("OVR", headerRightX, layout.ovrLabelY);

  if (input.record && layout.recordY) {
    context.font = `600 20px ${FONT_STACK}`;
    context.fillStyle = "#94a3b8";
    context.fillText(`Projected ${input.record}`, headerRightX, layout.recordY);
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
) => {
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Could not create share card canvas context.");
  }

  const lineup = sortLineupByPosition(input.lineup);
  const { cardHeight, footerY, headerLayout } = computeShareCardLayout(
    context,
    input,
    lineup,
  );

  canvas.width = CARD_WIDTH;
  canvas.height = cardHeight;

  drawTexturedBackground(context, cardHeight);

  context.strokeStyle = "rgba(255,255,255,0.08)";
  context.lineWidth = 2;
  roundRect(context, 40, 40, CARD_WIDTH - 80, cardHeight - 80, 32);
  context.stroke();

  drawShareCardHeader(context, input, headerLayout);

  lineup.forEach((player, index) => {
    drawPlayerRow(context, player, index, headerLayout.firstPlayerY + index * ROW_STEP);
  });

  context.fillStyle = "#94a3b8";
  context.font = `600 20px ${FONT_STACK}`;
  context.textAlign = "left";
  context.fillText("#DraftDayGM", 88, footerY);
  context.textAlign = "right";
  context.fillText("POWERED BY BALLACADEMY", CARD_WIDTH - 88, footerY);
  context.textAlign = "left";
};

export const createLineupShareCardBlob = async (input: LineupShareCardInput) => {
  await ensureShareCardFonts();

  const canvas = document.createElement("canvas");
  drawLineupShareCard(canvas, input);

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

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const saveLineupShareCard = async (input: LineupShareCardInput) => {
  const blob = await createLineupShareCardBlob(input);
  const filename = "draft-day-gm-lineup.png";
  const file = new File([blob], filename, { type: "image/png" });
  const shareText = `${input.teamName} • OVR ${input.ovr}`;

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      title: "Draft Day GM Lineup",
      text: shareText,
      files: [file],
    });
    return;
  }

  downloadBlob(blob, filename);
};
