import { downloadPngMaybeSquare } from "../instagramComposer/exportDownload";
import {
  renderStatCardCanvas,
  type StatCardRenderInput,
} from "./renderStatCardCanvas";

export const exportStatCardPng = async (
  _node: HTMLElement,
  filename: string,
  input: StatCardRenderInput,
  story = false,
  square = false,
) => {
  const canvas = await renderStatCardCanvas({ ...input, story }, 2);
  await downloadPngMaybeSquare(canvas, filename, square);
};
