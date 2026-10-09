import { toPng } from "html-to-image";
import {
  EXPORT_PIXEL_RATIO,
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
} from "./rankingState";

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

export const exportStandingsPng = async (
  node: HTMLElement,
  filename: string,
) => {
  const clone = node.cloneNode(true) as HTMLElement;
  clone.classList.add("is-exporting");
  clone.setAttribute("aria-hidden", "true");
  clone.style.cssText = [
    `width:${GRAPHIC_WIDTH}px`,
    `height:${GRAPHIC_HEIGHT}px`,
    "position:fixed",
    "left:-16000px",
    "top:0",
    "margin:0",
    "transform:none",
    "max-width:none",
    `--u:1px`,
  ].join(";");

  document.body.appendChild(clone);
  try {
    await waitForImages(clone);
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    const dataUrl = await toPng(clone, {
      cacheBust: true,
      pixelRatio: EXPORT_PIXEL_RATIO,
      width: GRAPHIC_WIDTH,
      height: GRAPHIC_HEIGHT,
      backgroundColor: "#000000",
      style: {
        width: `${GRAPHIC_WIDTH}px`,
        height: `${GRAPHIC_HEIGHT}px`,
        transform: "none",
      },
    });

    const link = document.createElement("a");
    link.download = filename;
    link.href = dataUrl;
    link.click();
  } finally {
    clone.remove();
  }
};
