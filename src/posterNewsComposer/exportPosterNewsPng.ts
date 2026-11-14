import { downloadPngMaybeSquare } from "../instagramComposer/exportDownload";
import {
  renderPosterNewsCanvas,
  type PosterNewsRenderInput,
} from "./renderPosterNewsCanvas";

export const exportPosterNewsPng = async (
  _node: HTMLElement,
  filename: string,
  input: PosterNewsRenderInput,
  story = false,
  square = false,
) => {
  const canvas = await renderPosterNewsCanvas({ ...input, story }, 2);
  await downloadPngMaybeSquare(canvas, filename, square);
};
