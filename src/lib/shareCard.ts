import { getTeamColors } from "./teamColors";
import type { DraftLetterGrade } from "./draftGrade";
import type { Player } from "./types";

export interface ShareCardInput {
  teamCity: string;
  teamName: string;
  grade: DraftLetterGrade;
  roast: string;
  ovr: number;
  projectedRecord: string;
  lineup: Player[];
  accent: string;
}

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1350;

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

const wrapText = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) => {
  const words = text.split(" ");
  let line = "";
  let currentY = y;

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    const metrics = context.measureText(testLine);

    if (metrics.width > maxWidth && line) {
      context.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }

  if (line) {
    context.fillText(line, x, currentY);
  }

  return currentY;
};

export const drawShareCard = (
  canvas: HTMLCanvasElement,
  input: ShareCardInput,
) => {
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Could not create share card canvas context.");
  }

  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;

  const gradient = context.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  gradient.addColorStop(0, "#1e1035");
  gradient.addColorStop(0.45, "#0f172a");
  gradient.addColorStop(1, "#111827");
  context.fillStyle = gradient;
  context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  context.strokeStyle = "rgba(255,255,255,0.18)";
  context.lineWidth = 4;
  roundRect(context, 48, 48, CARD_WIDTH - 96, CARD_HEIGHT - 96, 36);
  context.stroke();

  context.fillStyle = "#fb923c";
  context.font = "700 34px Arial, sans-serif";
  context.fillText("ROAST MY LINEUP", 96, 120);

  context.fillStyle = "#f8fafc";
  context.font = "800 72px Arial, sans-serif";
  context.fillText(input.grade, 96, 230);

  context.fillStyle = input.accent;
  context.font = "700 48px Arial, sans-serif";
  context.fillText(`${input.teamCity} ${input.teamName}`, 96, 300);

  context.fillStyle = "#cbd5e1";
  context.font = "500 34px Arial, sans-serif";
  context.fillText(`OVR ${input.ovr} • ${input.projectedRecord}`, 96, 360);

  context.fillStyle = "#f1f5f9";
  context.font = "600 38px Arial, sans-serif";
  wrapText(context, `"${input.roast}"`, 96, 450, CARD_WIDTH - 192, 48);

  context.fillStyle = "#94a3b8";
  context.font = "700 28px Arial, sans-serif";
  context.fillText("STARTING FIVE", 96, 620);

  input.lineup.forEach((player, index) => {
    const y = 690 + index * 110;
    const colors = getTeamColors(player.team);

    roundRect(context, 96, y, CARD_WIDTH - 192, 88, 20);
    context.fillStyle = "rgba(15,23,42,0.72)";
    context.fill();
    context.strokeStyle = "rgba(255,255,255,0.12)";
    context.stroke();

    context.beginPath();
    context.arc(150, y + 44, 30, 0, Math.PI * 2);
    context.fillStyle = colors.primary;
    context.fill();
    context.fillStyle = colors.secondary;
    context.font = "800 24px Arial, sans-serif";
    context.textAlign = "center";
    context.fillText(String(player.jerseyNumber || index + 1), 150, y + 54);
    context.textAlign = "left";

    context.fillStyle = "#f8fafc";
    context.font = "700 34px Arial, sans-serif";
    context.fillText(player.name, 200, y + 40);

    context.fillStyle = "#94a3b8";
    context.font = "500 26px Arial, sans-serif";
    context.fillText(
      `${player.position} • ${player.team} • ${(player.trueShooting * 100).toFixed(1)}% TS`,
      200,
      y + 72,
    );
  });

  context.fillStyle = "#64748b";
  context.font = "600 24px Arial, sans-serif";
  context.fillText("NBA Head-to-Head • #NBAHeadToHead", 96, CARD_HEIGHT - 84);
};

export const createShareCardBlob = async (input: ShareCardInput) => {
  const canvas = document.createElement("canvas");
  drawShareCard(canvas, input);

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

export const downloadShareCard = async (input: ShareCardInput, filename: string) => {
  const blob = await createShareCardBlob(input);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const shareLineupCard = async (input: ShareCardInput) => {
  const blob = await createShareCardBlob(input);
  const file = new File([blob], "roast-my-lineup.png", { type: "image/png" });
  const shareText = `${input.teamCity} ${input.teamName} earned a ${input.grade}. ${input.roast}`;

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      title: "Roast My Lineup",
      text: shareText,
      files: [file],
    });
    return;
  }

  await downloadShareCard(input, "roast-my-lineup.png");
};
