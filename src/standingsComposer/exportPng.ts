import { toPng } from "html-to-image";
import { EXPORT_HEIGHT, EXPORT_WIDTH } from "./rankingState";
import {
  canvasToPngBlob,
  renderStandingsCanvas,
  type StandingsRenderInput,
} from "./renderStandingsCanvas";

export { exportFilename } from "./rankingState";

const waitForImages = async (node: HTMLElement) => {
  const images = [...node.querySelectorAll("img")];
  await Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete && image.naturalWidth > 0) {
            resolve();
            return;
          }
          const done = () => resolve();
          image.addEventListener("load", done, { once: true });
          image.addEventListener("error", done, { once: true });
        }),
    ),
  );
  if (typeof document !== "undefined" && document.fonts?.ready) {
    await document.fonts.ready;
  }
};

const isMostlyBlack = (dataUrl: string) =>
  new Promise<boolean>((resolve) => {
    const image = new Image();
    image.onload = () => {
      const sample = document.createElement("canvas");
      sample.width = 48;
      sample.height = 60;
      const context = sample.getContext("2d");
      if (!context) {
        resolve(false);
        return;
      }
      context.drawImage(image, 0, 0, sample.width, sample.height);
      const pixels = context.getImageData(0, 0, sample.width, sample.height).data;
      let lit = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        if ((pixels[i] ?? 0) + (pixels[i + 1] ?? 0) + (pixels[i + 2] ?? 0) > 40) {
          lit += 1;
        }
      }
      resolve(lit < 20);
    };
    image.onerror = () => resolve(true);
    image.src = dataUrl;
  });

const downloadUrl = (url: string, filename: string) => {
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  link.click();
};

const captureDomPng = async (node: HTMLElement) => {
  await waitForImages(node);
  const rect = node.getBoundingClientRect();
  const width = Math.max(1, rect.width);
  const height = Math.max(1, rect.height);
  const pixelRatio = Math.max(EXPORT_WIDTH / width, EXPORT_HEIGHT / height, 2);
  return toPng(node, {
    cacheBust: true,
    pixelRatio,
    backgroundColor: "#000000",
    canvasWidth: EXPORT_WIDTH,
    canvasHeight: EXPORT_HEIGHT,
    width,
    height,
  });
};

const captureCanvasPng = async (input: StandingsRenderInput) => {
  const canvas = await renderStandingsCanvas(input, 2);
  const blob = await canvasToPngBlob(canvas);
  return URL.createObjectURL(blob);
};

export const exportStandingsPng = async (
  node: HTMLElement,
  filename: string,
  input: StandingsRenderInput,
) => {
  try {
    const dataUrl = await captureDomPng(node);
    if (!(await isMostlyBlack(dataUrl))) {
      downloadUrl(dataUrl, filename);
      return;
    }
  } catch {
    // Fall through to the canvas renderer.
  }

  const objectUrl = await captureCanvasPng(input);
  try {
    downloadUrl(objectUrl, filename);
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
  }
};
