/** Cool, dark header grain shared by the live board and PNG export. */

const TILE = 96;

const hashNoise = (x: number, y: number) => {
  let n = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};

const noiseTile = () => {
  const canvas = document.createElement("canvas");
  canvas.width = TILE;
  canvas.height = TILE;
  const context = canvas.getContext("2d");
  if (!context) {
    return canvas;
  }
  const image = context.createImageData(TILE, TILE);
  const data = image.data;
  for (let y = 0; y < TILE; y += 1) {
    for (let x = 0; x < TILE; x += 1) {
      const n = hashNoise(x, y);
      const i = (y * TILE + x) * 4;
      const v = Math.round(n * 255);
      data[i] = v;
      data[i + 1] = Math.min(255, v + 10);
      data[i + 2] = Math.min(255, v + 22);
      data[i + 3] = 36;
    }
  }
  context.putImageData(image, 0, 0);
  return canvas;
};

let tileCache: HTMLCanvasElement | null = null;

export const fillHeaderTexture = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) => {
  const gradient = context.createLinearGradient(x, y, x, y + h);
  gradient.addColorStop(0, "#171e2c");
  gradient.addColorStop(0.42, "#0c111a");
  gradient.addColorStop(1, "#08090e");
  context.fillStyle = gradient;
  context.fillRect(x, y, w, h);

  context.save();
  context.globalAlpha = 0.055;
  context.fillStyle = "#c4d2ea";
  for (let i = 0; i < w; i += 3) {
    context.fillRect(x + i, y, 1, h);
  }
  context.globalAlpha = 0.035;
  for (let j = 0; j < h; j += 3) {
    context.fillRect(x, y + j, w, 1);
  }
  context.restore();

  if (!tileCache) {
    tileCache = noiseTile();
  }
  const pattern = context.createPattern(tileCache, "repeat");
  if (pattern) {
    context.save();
    context.globalAlpha = 0.55;
    context.fillStyle = pattern;
    context.fillRect(x, y, w, h);
    context.restore();
  }
};
