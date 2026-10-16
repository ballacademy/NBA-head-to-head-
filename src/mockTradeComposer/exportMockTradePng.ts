import {
  downloadCanvasPng,
  toSquareCanvas,
} from "../instagramComposer/exportDownload";
import { squareFilename } from "../instagramComposer/exportPack";
import {
  renderMockTradeCanvas,
  type MockTradeRenderInput,
} from "./renderMockTradeCanvas";

export const exportMockTradePng = async (
  _node: HTMLElement,
  filename: string,
  input: MockTradeRenderInput,
  story = false,
  square = false,
) => {
  const canvas = await renderMockTradeCanvas({ ...input, story }, 2);
  if (square) {
    await downloadCanvasPng(await toSquareCanvas(canvas), squareFilename(filename));
    return;
  }
  await downloadCanvasPng(canvas, filename);
};
