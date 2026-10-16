import {
  downloadCanvasPng,
  toSquareCanvas,
} from "../instagramComposer/exportDownload";
import { squareFilename } from "../instagramComposer/exportPack";
import {
  renderCompareCanvas,
  type CompareRenderInput,
} from "./renderCompareCanvas";

export const exportComparePng = async (
  _node: HTMLElement,
  filename: string,
  input: CompareRenderInput,
  story = false,
  square = false,
) => {
  const canvas = await renderCompareCanvas({ ...input, story }, 2);
  if (square) {
    await downloadCanvasPng(await toSquareCanvas(canvas), squareFilename(filename));
    return;
  }
  await downloadCanvasPng(canvas, filename);
};
