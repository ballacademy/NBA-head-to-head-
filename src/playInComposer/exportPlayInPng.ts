import {
  downloadCanvasPng,
  toStoryCanvas,
} from "../instagramComposer/exportDownload";
import {
  renderPlayInCanvas,
  type PlayInRenderInput,
} from "./renderPlayInCanvas";

export const exportPlayInPng = async (
  _node: HTMLElement,
  filename: string,
  input: PlayInRenderInput,
  story = false,
) => {
  const canvas = await renderPlayInCanvas(input, 2);
  await downloadCanvasPng(
    story ? await toStoryCanvas(canvas) : canvas,
    filename,
  );
};
