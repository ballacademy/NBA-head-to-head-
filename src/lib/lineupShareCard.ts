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
const CARD_HEIGHT = 1280;
const FONT_STACK =
  'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

const JERSEY_POINTS: Array<[number, number]> = [
  [11, 9],
  [17, 5],
  [24, 11],
  [31, 5],
  [37, 9],
  [41, 19],
  [41, 43],
  [7, 43],
  [7, 19],
];

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
    document.fonts.load(`900 88px ${FONT_STACK}`),
  ]).then(() => undefined);

  return fontsReady;
};

const traceJerseyPath = (context: CanvasRenderingContext2D) => {
  const [first, ...rest] = JERSEY_POINTS;
  context.beginPath();
  context.moveTo(first[0], first[1]);

  for (const [x, y] of rest) {
    context.lineTo(x, y);
  }

  context.closePath();
};

const drawTexturedBackground = (context: CanvasRenderingContext2D) => {
  const baseGradient = context.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  baseGradient.addColorStop(0, "#0b0b0d");
  baseGradient.addColorStop(0.55, "#08080a");
  baseGradient.addColorStop(1, "#111114");
  context.fillStyle = baseGradient;
  context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  context.strokeStyle = "rgba(255,255,255,0.018)";
  context.lineWidth = 1;

  for (let offset = -CARD_HEIGHT; offset < CARD_WIDTH + CARD_HEIGHT; offset += 28) {
    context.beginPath();
    context.moveTo(offset, 0);
    context.lineTo(offset + CARD_HEIGHT, CARD_HEIGHT);
    context.stroke();
  }

  for (let index = 0; index < 5200; index += 1) {
    const x = Math.random() * CARD_WIDTH;
    const y = Math.random() * CARD_HEIGHT;
    const alpha = Math.random() * 0.05;
    context.fillStyle = `rgba(255,255,255,${alpha})`;
    context.fillRect(x, y, 1, 1);
  }

  const vignette = context.createRadialGradient(
    CARD_WIDTH / 2,
    CARD_HEIGHT * 0.42,
    120,
    CARD_WIDTH / 2,
    CARD_HEIGHT * 0.42,
    CARD_WIDTH * 0.78,
  );
  vignette.addColorStop(0, "rgba(255,255,255,0.03)");
  vignette.addColorStop(1, "rgba(0,0,0,0.55)");
  context.fillStyle = vignette;
  context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
};

const drawJerseyBadge = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  number: string,
  colors: TeamColors,
) => {
  const scale = size / 48;

  context.save();
  context.translate(x, y);
  context.scale(scale, scale);

  traceJerseyPath(context);

  context.shadowColor = rgbaFromHex(colors.primary, 0.85);
  context.shadowBlur = 14;
  context.fillStyle = colors.primary;
  context.fill();

  context.shadowBlur = 8;
  context.shadowColor = rgbaFromHex(colors.secondary, 0.75);
  context.strokeStyle = colors.secondary;
  context.lineWidth = 2.4;
  context.lineJoin = "round";
  context.stroke();

  context.shadowBlur = 0;
  context.beginPath();
  context.arc(24, 11, 3.5, Math.PI, 0);
  context.strokeStyle = "rgba(0,0,0,0.38)";
  context.lineWidth = 1.5;
  context.stroke();

  context.font = `900 11px ${FONT_STACK}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineWidth = 1.2;
  context.strokeStyle = "rgba(8,8,10,0.65)";
  context.fillStyle = "#ffffff";
  context.strokeText(number, 24, 30);
  context.fillText(number, 24, 30);

  context.restore();
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
  rowGradient.addColorStop(0, rgbaFromHex(colors.primary, 0.28));
  rowGradient.addColorStop(0.45, "rgba(12,12,14,0.92)");
  rowGradient.addColorStop(1, "rgba(8,8,10,0.96)");
  context.fillStyle = rowGradient;
  context.fill();

  context.save();
  context.shadowColor = rgbaFromHex(colors.secondary, 0.45);
  context.shadowBlur = 10;
  context.strokeStyle = rgbaFromHex(colors.secondary, 0.55);
  context.lineWidth = 1;
  context.stroke();
  context.restore();

  drawJerseyBadge(context, rowX + 18, y + 16, 72, jerseyNumber, colors);

  context.fillStyle = "#f8fafc";
  context.font = `700 30px ${FONT_STACK}`;
  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  context.fillText(player.name, 210, y + 46);

  context.fillStyle = "#94a3b8";
  context.font = `500 22px ${FONT_STACK}`;
  context.fillText(
    `${player.position} • ${player.team} • ${player.points.toFixed(1)} PTS`,
    210,
    y + 78,
  );
};

const drawShareCardHeader = (
  context: CanvasRenderingContext2D,
  input: LineupShareCardInput,
) => {
  const headerX = 88;

  context.textAlign = "left";
  context.textBaseline = "alphabetic";

  context.font = `900 22px ${FONT_STACK}`;
  context.fillStyle = "#fb923c";
  context.letterSpacing = "3.6px";
  context.fillText("DRAFT DAY GM", headerX, 98);
  context.letterSpacing = "0px";

  context.font = `800 54px ${FONT_STACK}`;
  context.fillStyle = "#f8fafc";
  context.fillText(input.teamName, headerX, 168);

  let ovrTop = 252;

  if (input.record) {
    context.font = `600 24px ${FONT_STACK}`;
    context.fillStyle = "#94a3b8";
    context.fillText(`Projected ${input.record}`, headerX, 212);
    ovrTop = 292;
  }

  context.save();
  context.shadowColor = rgbaFromHex(input.accent, 0.45);
  context.shadowBlur = 16;
  context.font = `900 88px ${FONT_STACK}`;
  context.fillStyle = "#ffffff";
  context.fillText(String(input.ovr), headerX, ovrTop);
  context.restore();

  context.font = `700 22px ${FONT_STACK}`;
  context.fillStyle = "#94a3b8";
  context.fillText("OVR", headerX, ovrTop + 34);

  context.font = `900 20px ${FONT_STACK}`;
  context.fillStyle = "rgba(148, 163, 184, 0.92)";
  context.letterSpacing = "2.8px";
  context.fillText("STARTING FIVE", headerX, ovrTop + 84);
  context.letterSpacing = "0px";

  return ovrTop + 118;
};

export const drawLineupShareCard = (
  canvas: HTMLCanvasElement,
  input: LineupShareCardInput,
) => {
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Could not create share card canvas context.");
  }

  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;

  const lineup = sortLineupByPosition(input.lineup);

  drawTexturedBackground(context);

  context.strokeStyle = "rgba(255,255,255,0.08)";
  context.lineWidth = 2;
  roundRect(context, 40, 40, CARD_WIDTH - 80, CARD_HEIGHT - 80, 32);
  context.stroke();

  const firstPlayerY = drawShareCardHeader(context, input);

  lineup.forEach((player, index) => {
    drawPlayerRow(context, player, index, firstPlayerY + index * 118);
  });

  const footerY = CARD_HEIGHT - 72;

  context.fillStyle = "#94a3b8";
  context.font = `600 20px ${FONT_STACK}`;
  context.textAlign = "left";
  context.fillText("#DraftDayGM", 88, footerY);
  context.textAlign = "right";
  context.fillText("produced by ballacademy", CARD_WIDTH - 88, footerY);
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
