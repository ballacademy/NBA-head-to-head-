import {
  downloadCanvasPng,
  toStoryCanvas,
} from "../instagramComposer/exportDownload";
import {
  renderPlayerOfTheDayCanvas,
  type PlayerOfTheDayRenderInput,
} from "./renderPlayerOfTheDayCanvas";

export { exportPotdFilename } from "./playerOfTheDayState";

export const exportPlayerOfTheDayPng = async (
  _node: HTMLElement,
  filename: string,
  input: PlayerOfTheDayRenderInput,
  story = false,
) => {
  const canvas = await renderPlayerOfTheDayCanvas(input, 2);
  await downloadCanvasPng(story ? await toStoryCanvas(canvas) : canvas, filename);
};
