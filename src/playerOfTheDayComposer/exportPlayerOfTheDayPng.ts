import {
  downloadPngMaybeSquare,
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
  square = false,
) => {
  const canvas = await renderPlayerOfTheDayCanvas(input, 2);
  const board = story ? await toStoryCanvas(canvas) : canvas;
  await downloadPngMaybeSquare(board, filename, square);
};
