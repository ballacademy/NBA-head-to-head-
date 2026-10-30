import { downloadPngMaybeSquare } from "../instagramComposer/exportDownload";
import { renderPlotCanvas, type PlotRenderInput } from "./renderPlotCanvas";

export const exportPlotPng = async (
  _node: HTMLElement,
  filename: string,
  input: PlotRenderInput,
  story = false,
  square = false,
) => {
  const canvas = await renderPlotCanvas({ ...input, story }, 2);
  await downloadPngMaybeSquare(canvas, filename, square);
};
