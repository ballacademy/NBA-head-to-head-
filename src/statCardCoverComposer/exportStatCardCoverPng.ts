import {
  downloadPngMaybeSquare,
  toStoryCanvas,
} from "../instagramComposer/exportDownload";
import {
  renderStatCardCoverCanvas,
  type StatCardCoverRenderInput,
} from "./renderStatCardCoverCanvas";

export const exportStatCardCoverPng = async (
  _node: HTMLElement,
  filename: string,
  input: StatCardCoverRenderInput,
  story = false,
  square = false,
) => {
  const canvas = await renderStatCardCoverCanvas(input, 2);
  const board = story ? await toStoryCanvas(canvas, { safe: true }) : canvas;
  await downloadPngMaybeSquare(board, filename, square);
};
