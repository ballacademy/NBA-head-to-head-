import { downloadPngMaybeSquare } from "../instagramComposer/exportDownload";
import {
  renderPyramidCanvas,
  type PyramidRenderInput,
} from "./renderPyramidCanvas";

export const exportPyramidPng = async (
  _node: HTMLElement,
  filename: string,
  input: PyramidRenderInput,
  story = false,
  square = false,
) => {
  const canvas = await renderPyramidCanvas({ ...input, story }, 2);
  await downloadPngMaybeSquare(canvas, filename, square);
};
