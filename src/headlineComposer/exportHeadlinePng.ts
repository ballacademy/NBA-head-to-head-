import { downloadCanvasPng } from "../instagramComposer/exportDownload";
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
  const canvas = await renderHeadlineCanvas({ ...input, story }, 2);
  await downloadCanvasPng(canvas, filename);
};
