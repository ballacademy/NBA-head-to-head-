import {
  downloadCanvasPng,
  toStoryCanvas,
} from "../instagramComposer/exportDownload";
import { renderQuoteCanvas, type QuoteRenderInput } from "./renderQuoteCanvas";

export const exportQuotePng = async (
  _node: HTMLElement,
  filename: string,
  input: QuoteRenderInput,
  story = false,
) => {
  const canvas = await renderQuoteCanvas(input, 2);
  await downloadCanvasPng(
    story ? await toStoryCanvas(canvas, { safe: true }) : canvas,
    filename,
  );
};
