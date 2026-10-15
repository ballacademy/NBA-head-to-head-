import {
  downloadCanvasPng,
  toStoryCanvas,
} from "../instagramComposer/exportDownload";
import {
  renderHeadlineCanvas,
  type HeadlineRenderInput,
} from "./renderHeadlineCanvas";

export const exportHeadlinePng = async (
  _node: HTMLElement,
  filename: string,
  input: HeadlineRenderInput,
  story = false,
) => {
  const canvas = await renderHeadlineCanvas(input, 2);
  await downloadCanvasPng(
    story ? await toStoryCanvas(canvas, { safe: true }) : canvas,
    filename,
  );
};
