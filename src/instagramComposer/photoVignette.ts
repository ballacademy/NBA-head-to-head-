/** Light edge falloff so strip photos do not flatten into the metal field. */
export const paintPhotoVignette = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) => {
  if (w < 1 || h < 1) {
    return;
  }
  const cx = x + w * 0.5;
  const cy = y + h * 0.4;
  const inner = Math.min(w, h) * 0.22;
  const outer = Math.hypot(w, h) * 0.58;
  const wash = context.createRadialGradient(cx, cy, inner, cx, cy, outer);
  wash.addColorStop(0, "rgba(0, 0, 0, 0)");
  wash.addColorStop(0.55, "rgba(0, 0, 0, 0.06)");
  wash.addColorStop(1, "rgba(0, 0, 0, 0.38)");
  context.fillStyle = wash;
  context.fillRect(x, y, w, h);
};
