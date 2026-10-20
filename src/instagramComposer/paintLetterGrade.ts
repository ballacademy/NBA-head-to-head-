import {
  letterGradePaint,
  letterGradeReasonText,
  type LetterGrade,
} from "../lib/letterGrade";

const POSTER_FONT = "Montserrat, ui-sans-serif, system-ui, sans-serif";

export const paintLetterGradePlate = (
  context: CanvasRenderingContext2D,
  box: { x: number; y: number; w: number; h: number },
  grade: LetterGrade,
  reason: string,
  scale: number,
) => {
  if (box.w <= 0 || box.h <= 0) {
    return;
  }
  const s = scale;
  const x = box.x * s;
  const y = box.y * s;
  const w = box.w * s;
  const h = box.h * s;
  const paint = letterGradePaint(grade);
  const radius = Math.min(8 * s, w * 0.08);
  context.save();
  context.beginPath();
  context.roundRect(x, y, w, h, radius);
  const wash = context.createLinearGradient(x, y, x, y + h);
  wash.addColorStop(0, "rgba(255,255,255,0.18)");
  wash.addColorStop(0.4, "rgba(255,255,255,0.04)");
  wash.addColorStop(1, "rgba(0,0,0,0.22)");
  context.fillStyle = paint.fill;
  context.fill();
  context.fillStyle = wash;
  context.fill();
  context.lineWidth = 2.2 * s;
  context.strokeStyle = paint.stroke;
  context.stroke();
  context.shadowColor = "rgba(0,0,0,0.28)";
  context.shadowBlur = 0;
  context.shadowOffsetY = 1 * s;
  context.fillStyle = paint.ink;
  context.textAlign = "center";
  context.textBaseline = "middle";
  const note = letterGradeReasonText(reason);
  const markSize = Math.min(46 * s, h * (note ? 0.52 : 0.62));
  context.font = `italic 900 ${markSize}px ${POSTER_FONT}`;
  const markY = note ? y + h * 0.42 : y + h * 0.5;
  context.fillText(grade, x + w / 2, markY, w - 12 * s);
  if (note) {
    context.font = `900 ${Math.min(11 * s, h * 0.16)}px ${POSTER_FONT}`;
    const spaced = context as CanvasRenderingContext2D & { letterSpacing: string };
    if (typeof spaced.letterSpacing === "string") {
      spaced.letterSpacing = `${0.08 * 11 * s}px`;
    }
    context.fillText(note.toUpperCase(), x + w / 2, y + h * 0.82, w - 10 * s);
    if (typeof spaced.letterSpacing === "string") {
      spaced.letterSpacing = "0px";
    }
  }
  context.restore();
};
