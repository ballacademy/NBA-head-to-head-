import { downloadPngMaybeSquare } from "../instagramComposer/exportDownload";
import { renderQuoteCanvas, type QuoteRenderInput } from "./renderQuoteCanvas";

export const exportQuotePng = async (
  _node: HTMLElement,
  filename: string,
  input: QuoteRenderInput,
  story = false,
  square = false,
) => {
  const canvas = await renderQuoteCanvas({ ...input, story }, 2);
  await downloadPngMaybeSquare(canvas, filename, square);
};
