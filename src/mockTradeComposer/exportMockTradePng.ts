import { downloadCanvasPng } from "../instagramComposer/exportDownload";
import {
  renderMockTradeCanvas,
  type MockTradeRenderInput,
} from "./renderMockTradeCanvas";

export const exportMockTradePng = async (
  _node: HTMLElement,
  filename: string,
  input: MockTradeRenderInput,
  story = false,
) => {
  const canvas = await renderMockTradeCanvas({ ...input, story }, 2);
  await downloadCanvasPng(canvas, filename);
};
