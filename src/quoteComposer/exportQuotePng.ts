import {
  downloadPngMaybeSquare,
  toStoryCanvas,
} from "../instagramComposer/exportDownload";
import { renderQuoteCanvas, type QuoteRenderInput } from "./renderQuoteCanvas";

export const exportQuotePng = async (
  _node: HTMLElement,
  filename: string,
  input: QuoteRenderInput,
  story = false,
  square = false,
) => {
  const canvas = await renderQuoteCanvas(input, 2);
  const board = story ? await toStoryCanvas(canvas, { safe: true }) : canvas;
  await downloadPngMaybeSquare(board, filename, square);
};
