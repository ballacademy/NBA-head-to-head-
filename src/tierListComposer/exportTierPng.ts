import {
  downloadPngMaybeSquare,
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
  square = false,
) => {
  const canvas = await renderTierListCanvas(input, 2);
  const board = story ? await toStoryCanvas(canvas) : canvas;
  await downloadPngMaybeSquare(board, filename, square);
};
