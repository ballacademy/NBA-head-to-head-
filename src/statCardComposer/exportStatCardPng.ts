import {
  downloadCanvasPng,
  toStoryCanvas,
} from "../instagramComposer/exportDownload";
import {
  renderStatCardCanvas,
  type StatCardRenderInput,
} from "./renderStatCardCanvas";

export const exportStatCardPng = async (
  _node: HTMLElement,
  filename: string,
  input: StatCardRenderInput,
  story = false,
) => {
  const canvas = await renderStatCardCanvas(input, 2);
  await downloadCanvasPng(
    story ? await toStoryCanvas(canvas, { safe: true }) : canvas,
    filename,
  );
};
