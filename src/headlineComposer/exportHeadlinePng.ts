import { downloadPngMaybeSquare } from "../instagramComposer/exportDownload";
import {
  renderHeadlineCanvas,
  type HeadlineRenderInput,
} from "./renderHeadlineCanvas";

export const exportHeadlinePng = async (
  _node: HTMLElement,
  filename: string,
  input: HeadlineRenderInput,
  story = false,
  square = false,
) => {
  const canvas = await renderHeadlineCanvas({ ...input, story }, 2);
  await downloadPngMaybeSquare(canvas, filename, square);
};
