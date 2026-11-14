import { downloadPngMaybeSquare } from "../instagramComposer/exportDownload";
import {
  renderPlayerOfTheDayCanvas,
  type PlayerOfTheDayRenderInput,
} from "./renderPlayerOfTheDayCanvas";

export { exportPotdFilename } from "./playerOfTheDayState";

export const exportPlayerOfTheDayPng = async (
  _node: HTMLElement,
  filename: string,
  input: PlayerOfTheDayRenderInput,
  story = false,
  square = false,
) => {
  const canvas = await renderPlayerOfTheDayCanvas(
    { ...input, story },
    2,
  );
  await downloadPngMaybeSquare(canvas, filename, square);
};
