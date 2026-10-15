import {
  downloadCanvasPng,
  toStoryCanvas,
} from "../instagramComposer/exportDownload";
import {
  renderTierListCanvas,
  type TierListRenderInput,
} from "./renderTierListCanvas";

export { exportTierFilename } from "./tierState";

export const exportTierListPng = async (
  _node: HTMLElement,
  filename: string,
  input: TierListRenderInput,
  story = false,
) => {
  const canvas = await renderTierListCanvas(input, 2);
  await downloadCanvasPng(story ? await toStoryCanvas(canvas) : canvas, filename);
};
