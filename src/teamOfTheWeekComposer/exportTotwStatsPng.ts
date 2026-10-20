import {
  downloadPngMaybeSquare,
  toStoryCanvas,
} from "../instagramComposer/exportDownload";
import {
  renderTotwStatsCanvas,
  type TotwStatsRenderLook,
} from "./renderTotwStatsCanvas";
import { totwStatsPngFilename, type TotwStatsSheet } from "./totwStatsExport";

export const exportTotwStatsPng = async (
  sheet: TotwStatsSheet,
  filename: string | undefined,
  look: TotwStatsRenderLook = {},
  story = false,
  square = false,
) => {
  const canvas = await renderTotwStatsCanvas(sheet, look, 2);
  const board = story ? await toStoryCanvas(canvas) : canvas;
  await downloadPngMaybeSquare(
    board,
    filename ?? totwStatsPngFilename(sheet, story),
    square,
  );
};
