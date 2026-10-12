import {
  canvasToPngBlob,
  renderPlayerOfTheDayCanvas,
  type PlayerOfTheDayRenderInput,
} from "./renderPlayerOfTheDayCanvas";

export { exportPotdFilename } from "./playerOfTheDayState";

export const exportPlayerOfTheDayPng = async (
  _node: HTMLElement,
  filename: string,
  input: PlayerOfTheDayRenderInput,
) => {
  const canvas = await renderPlayerOfTheDayCanvas(input, 2);
  const blob = await canvasToPngBlob(canvas);
  const objectUrl = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.download = filename;
    link.href = objectUrl;
    link.click();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
  }
};
