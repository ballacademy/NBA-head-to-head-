import {
  canvasToPngBlob,
  renderTierListCanvas,
  type TierListRenderInput,
} from "./renderTierListCanvas";

export { exportTierFilename } from "./tierState";

export const exportTierListPng = async (
  _node: HTMLElement,
  filename: string,
  input: TierListRenderInput,
) => {
  const canvas = await renderTierListCanvas(input, 2);
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
