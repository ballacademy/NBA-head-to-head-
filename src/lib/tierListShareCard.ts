import { ensureShareCardFonts } from "./lineupShareCard";
import {
  arePlayerHeadshotsEnabled,
  drawCircularPlayerHeadshot,
  getPlayerHeadshotUrl,
  loadPlayerHeadshotImages,
} from "./playerHeadshots";
import { getTeamGlowColor } from "./teamColors";

export interface TierListSharePlayer {
  name: string;
  team: string;
  position: string;
  bbrPlayerId?: string;
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
const CHIP_AVATAR_SIZE = 28;
const CHIP_AVATAR_GAP = 8;
const FOOTER_GAP = 40;
const FONT_STACK =
  'Barlow, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

const playerLabel = (player: TierListSharePlayer) =>
  `${player.name} · ${player.team} ${player.position}`;

const chipUsesHeadshotSlot = (
  player: TierListSharePlayer,
  headshotsEnabled: boolean,
) =>
  headshotsEnabled && Boolean(getPlayerHeadshotUrl(player.bbrPlayerId));

const measureChipWidth = (
  context: CanvasRenderingContext2D,
  player: TierListSharePlayer,
  headshotsEnabled: boolean,
) => {
  const label = player.team ? playerLabel(player) : player.name;
  const textWidth = context.measureText(label).width;
  const avatarWidth = chipUsesHeadshotSlot(player, headshotsEnabled)
    ? CHIP_AVATAR_SIZE + CHIP_AVATAR_GAP
    : 0;
  return textWidth + CHIP_PAD_X * 2 + avatarWidth;
};

const wrapLabelLines = (
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
) => {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return ["Tier"];
  }

  if (words.length === 1) {
    return [words[0]!];
  }

  const lines: string[] = [];
  let current = words[0]!;

  for (const word of words.slice(1)) {
    const candidate = `${current} ${word}`;
    if (context.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }

    lines.push(current);
    current = word;
    if (lines.length >= maxLines) {
      break;
    }
  }

  if (lines.length < maxLines) {
    lines.push(current);
  } else {
    const last = lines[lines.length - 1] ?? "";
    lines[lines.length - 1] =
      last.length > 1 ? `${last.slice(0, Math.max(1, last.length - 1))}…` : "…";
  }

  return lines.slice(0, maxLines);
};

const drawTierLabel = (
  context: CanvasRenderingContext2D,
  rawName: string,
  centerX: number,
  centerY: number,
  maxWidth: number,
  maxHeight: number,
) => {
  const name = (rawName.trim() || "Tier").slice(0, 12);
  let fontSize = 28;

  while (fontSize >= 14) {
    context.font = `800 ${fontSize}px ${FONT_STACK}`;
    const lines = wrapLabelLines(context, name, maxWidth, 3);
    const lineHeight = fontSize * 1.15;
    const blockHeight = lines.length * lineHeight;
    const widest = Math.max(
      ...lines.map((line) => context.measureText(line).width),
      0,
    );

    if (blockHeight <= maxHeight && widest <= maxWidth) {
      const startY = centerY - blockHeight / 2 + lineHeight * 0.8;
      context.textAlign = "center";
      context.fillStyle = "#f8fafc";
      lines.forEach((line, index) => {
        context.fillText(line, centerX, startY + index * lineHeight);
      });
      return;
    }

    fontSize -= 2;
  }

  context.font = `800 14px ${FONT_STACK}`;
  context.textAlign = "center";
  context.fillStyle = "#f8fafc";
  context.fillText(name, centerX, centerY + 5);
};

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

const wrapPlayerChips = (
  context: CanvasRenderingContext2D,
  players: TierListSharePlayer[],
  maxWidth: number,
  headshotsEnabled: boolean,
) => {
  context.font = `700 18px ${FONT_STACK}`;
  const rows: TierListSharePlayer[][] = [[]];
  let rowWidth = 0;

  const entries =
    players.length > 0
      ? players
      : [{ name: "Empty", team: "", position: "" } satisfies TierListSharePlayer];

  for (const player of entries) {
    const chipWidth = measureChipWidth(context, player, headshotsEnabled);
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
  headshotsEnabled: boolean,
) => {
  let y = PAD_TOP + TITLE_SIZE + 36;
  const contentWidth = CARD_WIDTH - PAD_X * 2 - TIER_LABEL_WIDTH - 16;

  for (const tier of input.tiers) {
    const rows = wrapPlayerChips(
      context,
      tier.players,
      contentWidth,
      headshotsEnabled,
    );
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
  headshots: Map<string, HTMLImageElement> = new Map(),
  headshotsEnabled = arePlayerHeadshotsEnabled(),
) => {
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not create tier list share card canvas context.");
  }

  const height = measureCardHeight(context, input, headshotsEnabled);
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
    const chipRows = wrapPlayerChips(
      context,
      tier.players,
      contentWidth,
      headshotsEnabled,
    );
    const rowHeight = Math.max(
      72,
      chipRows.length * CHIP_HEIGHT + (chipRows.length - 1) * CHIP_GAP + 24,
    );

    // Tier label column only — no broad row box behind player chips.
    const labelX = PAD_X;
    const labelWidth = 10 + TIER_LABEL_WIDTH;
    context.fillStyle = "#1e293b";
    roundRect(context, labelX, y, labelWidth, rowHeight, 14);
    context.fill();

    context.fillStyle = tier.accent;
    context.fillRect(labelX, y, 10, rowHeight);

    drawTierLabel(
      context,
      tier.name || "Tier",
      labelX + 10 + TIER_LABEL_WIDTH / 2,
      y + rowHeight / 2,
      TIER_LABEL_WIDTH - 16,
      rowHeight - 16,
    );
    context.textAlign = "left";

    let chipY = y + 12;
    for (const row of chipRows) {
      let chipX = labelX + labelWidth + 8;
      context.font = `700 18px ${FONT_STACK}`;

      for (const player of row) {
        const label = player.team ? playerLabel(player) : player.name;
        const headshot = player.bbrPlayerId
          ? headshots.get(player.bbrPlayerId)
          : undefined;
        const reserveAvatar = chipUsesHeadshotSlot(player, headshotsEnabled);
        const chipWidth = measureChipWidth(context, player, headshotsEnabled);
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

        let textX = chipX + CHIP_PAD_X;
        if (reserveAvatar) {
          const avatarX = chipX + CHIP_PAD_X - 2;
          const avatarY = chipY + (CHIP_HEIGHT - CHIP_AVATAR_SIZE) / 2;
          if (headshot) {
            drawCircularPlayerHeadshot(
              context,
              headshot,
              avatarX,
              avatarY,
              CHIP_AVATAR_SIZE,
              primary,
            );
          } else {
            // Keep chip layout stable if the image failed to load.
            context.fillStyle = "rgba(148, 163, 184, 0.28)";
            context.beginPath();
            context.arc(
              avatarX + CHIP_AVATAR_SIZE / 2,
              avatarY + CHIP_AVATAR_SIZE / 2,
              CHIP_AVATAR_SIZE / 2,
              0,
              Math.PI * 2,
            );
            context.fill();
          }
          textX += CHIP_AVATAR_SIZE + CHIP_AVATAR_GAP;
        }

        context.fillStyle = "#ffffff";
        context.fillText(label, textX, chipY + 28);
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
  const headshotsEnabled = arePlayerHeadshotsEnabled();
  const headshots = await loadPlayerHeadshotImages(
    input.tiers.flatMap((tier) =>
      tier.players.map((player) => player.bbrPlayerId),
    ),
    { enabled: headshotsEnabled },
  );
  const canvas = document.createElement("canvas");
  drawTierListShareCard(canvas, input, headshots, headshotsEnabled);

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
