import {
  downloadCanvasPng,
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
) => {
  const canvas = await renderStatCardCoverCanvas(input, 2);
  await downloadCanvasPng(
    story ? await toStoryCanvas(canvas, { safe: true }) : canvas,
    filename,
  );
};
