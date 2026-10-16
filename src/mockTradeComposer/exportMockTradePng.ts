import { downloadPngMaybeSquare } from "../instagramComposer/exportDownload";
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
  await downloadPngMaybeSquare(canvas, filename, square);
};
