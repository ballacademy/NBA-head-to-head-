import { ensureShareCardFonts } from "./lineupShareCard";
import { getTeamGlowColor } from "./teamColors";

export interface TierListSharePlayer {
  name: string;
  team: string;
  position: string;
}

export interface TierListShareTier {
  name: string;
  accent: string;
  players: TierListSharePlayer[];
}

export interface TierListShareCardInput {
  title: string;
  tiers: TierListShareTier[];
}

const CARD_WIDTH = 1080;
const PAD_X = 48;
const PAD_TOP = 56;
const TITLE_SIZE = 54;
const TIER_LABEL_WIDTH = 120;
const ROW_GAP = 14;
const CHIP_HEIGHT = 44;
const CHIP_GAP = 10;
const CHIP_PAD_X = 14;
const FOOTER_GAP = 40;
const FONT_STACK =
  'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

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

const playerLabel = (player: TierListSharePlayer) =>
  `${player.name} · ${player.team} ${player.position}`;

const wrapPlayerChips = (
  context: CanvasRenderingContext2D,
  players: TierListSharePlayer[],
  maxWidth: number,
) => {
  context.font = `700 18px ${FONT_STACK}`;
  const rows: TierListSharePlayer[][] = [[]];
  let rowWidth = 0;

  const entries =
    players.length > 0
      ? players
      : [{ name: "Empty", team: "", position: "" } satisfies TierListSharePlayer];

  for (const player of entries) {
    const label = player.team
      ? playerLabel(player)
      : player.name;
    const chipWidth = context.measureText(label).width + CHIP_PAD_X * 2;
    const nextWidth =
      rowWidth === 0 ? chipWidth : rowWidth + CHIP_GAP + chipWidth;

    if (nextWidth > maxWidth && rows[rows.length - 1]!.length > 0) {
      rows.push([player]);
      rowWidth = chipWidth;
    } else {
      rows[rows.length - 1]!.push(player);
      rowWidth = nextWidth;
    }
  }

  return rows;
};

const measureCardHeight = (
  context: CanvasRenderingContext2D,
  input: TierListShareCardInput,
) => {
  let y = PAD_TOP + TITLE_SIZE + 36;
  const contentWidth = CARD_WIDTH - PAD_X * 2 - TIER_LABEL_WIDTH - 16;

  for (const tier of input.tiers) {
    const rows = wrapPlayerChips(context, tier.players, contentWidth);
    const rowHeight = Math.max(
      72,
      rows.length * CHIP_HEIGHT + (rows.length - 1) * CHIP_GAP + 24,
    );
    y += rowHeight + ROW_GAP;
  }

  return y + FOOTER_GAP + 28;
};

export const drawTierListShareCard = (
  canvas: HTMLCanvasElement,
  input: TierListShareCardInput,
) => {
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not create tier list share card canvas context.");
  }

  const height = measureCardHeight(context, input);
  canvas.width = CARD_WIDTH;
  canvas.height = height;

  const gradient = context.createLinearGradient(0, 0, CARD_WIDTH, height);
  gradient.addColorStop(0, "#0b1220");
  gradient.addColorStop(1, "#111827");
  context.fillStyle = gradient;
  context.fillRect(0, 0, CARD_WIDTH, height);

  const title = input.title.trim() || "Name your tier list";

  context.fillStyle = "#f8fafc";
  context.font = `800 ${TITLE_SIZE}px ${FONT_STACK}`;
  context.textAlign = "left";
  context.fillText(title, PAD_X, PAD_TOP + TITLE_SIZE - 8);

  context.fillStyle = "#94a3b8";
  context.font = `700 18px ${FONT_STACK}`;
  context.fillText("Draft Day GM · Tier List", PAD_X, PAD_TOP + TITLE_SIZE + 18);

  let y = PAD_TOP + TITLE_SIZE + 36;
  const contentWidth = CARD_WIDTH - PAD_X * 2 - TIER_LABEL_WIDTH - 16;

  for (const tier of input.tiers) {
    const chipRows = wrapPlayerChips(context, tier.players, contentWidth);
    const rowHeight = Math.max(
      72,
      chipRows.length * CHIP_HEIGHT + (chipRows.length - 1) * CHIP_GAP + 24,
    );

    context.fillStyle = "#1e293b";
    roundRect(context, PAD_X, y, CARD_WIDTH - PAD_X * 2, rowHeight, 16);
    context.fill();

    context.fillStyle = tier.accent;
    context.fillRect(PAD_X, y, 10, rowHeight);

    context.fillStyle = "#f8fafc";
    context.font = `800 28px ${FONT_STACK}`;
    context.textAlign = "center";
    context.fillText(
      tier.name || "Tier",
      PAD_X + 10 + TIER_LABEL_WIDTH / 2,
      y + rowHeight / 2 + 10,
    );
    context.textAlign = "left";

    let chipY = y + 12;
    for (const row of chipRows) {
      let chipX = PAD_X + 10 + TIER_LABEL_WIDTH + 8;
      context.font = `700 18px ${FONT_STACK}`;

      for (const player of row) {
        const label = player.team ? playerLabel(player) : player.name;
        const chipWidth = context.measureText(label).width + CHIP_PAD_X * 2;
        const primary = player.team
          ? getTeamGlowColor(player.team)
          : "#94a3b8";

        context.shadowColor = primary;
        context.shadowBlur = 14;
        context.fillStyle = "#171b22";
        roundRect(context, chipX, chipY, chipWidth, CHIP_HEIGHT, 12);
        context.fill();

        // Subtle grain on chip face
        context.shadowBlur = 0;
        context.fillStyle = "rgba(255, 255, 255, 0.035)";
        for (let grainY = chipY + 3; grainY < chipY + CHIP_HEIGHT - 3; grainY += 3) {
          for (
            let grainX = chipX + 3;
            grainX < chipX + chipWidth - 3;
            grainX += 3
          ) {
            if ((grainX + grainY) % 6 === 0) {
              context.fillRect(grainX, grainY, 1, 1);
            }
          }
        }

        context.strokeStyle = primary;
        context.lineWidth = 2;
        roundRect(context, chipX, chipY, chipWidth, CHIP_HEIGHT, 12);
        context.stroke();
        context.lineWidth = 1;

        context.fillStyle = "#ffffff";
        context.fillText(label, chipX + CHIP_PAD_X, chipY + 28);
        chipX += chipWidth + CHIP_GAP;
      }

      chipY += CHIP_HEIGHT + CHIP_GAP;
    }

    y += rowHeight + ROW_GAP;
  }

  context.fillStyle = "#94a3b8";
  context.font = `600 18px ${FONT_STACK}`;
  context.fillText("#DraftDayGM", PAD_X, height - 24);
  context.textAlign = "right";
  context.fillText("POWERED BY BALLACADEMY", CARD_WIDTH - PAD_X, height - 24);
  context.textAlign = "left";
};

export const createTierListShareCardBlob = async (
  input: TierListShareCardInput,
  type: "image/png" | "image/jpeg" = "image/png",
) => {
  await ensureShareCardFonts();
  const canvas = document.createElement("canvas");
  drawTierListShareCard(canvas, input);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not create tier list image."));
          return;
        }
        resolve(blob);
      },
      type,
      type === "image/jpeg" ? 0.92 : undefined,
    );
  });
};

export const downloadTierListImage = async (
  input: TierListShareCardInput,
  format: "png" | "jpg" = "png",
) => {
  const mime = format === "jpg" ? "image/jpeg" : "image/png";
  const blob = await createTierListShareCardBlob(input, mime);
  const safeTitle =
    (input.title.trim() || "tier-list")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "tier-list";
  downloadBlob(blob, `${safeTitle}.${format}`);
};
