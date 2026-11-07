import { downloadPngMaybeSquare } from "../instagramComposer/exportDownload";
import {
  renderShotChartCanvas,
  type ShotChartRenderInput,
} from "./renderShotChartCanvas";

export const exportShotChartPng = async (
  _node: HTMLElement,
  filename: string,
  input: ShotChartRenderInput,
  story = false,
  square = false,
) => {
  const canvas = await renderShotChartCanvas({ ...input, story }, 2);
  await downloadPngMaybeSquare(canvas, filename, square);
};
