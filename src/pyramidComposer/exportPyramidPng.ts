import { downloadCanvasPng } from "../instagramComposer/exportDownload";
import {
  renderPyramidCanvas,
  type PyramidRenderInput,
} from "./renderPyramidCanvas";

export const exportPyramidPng = async (
  _node: HTMLElement,
  filename: string,
  input: PyramidRenderInput,
  story = false,
) => {
  const canvas = await renderPyramidCanvas({ ...input, story }, 2);
  await downloadCanvasPng(canvas, filename);
};
