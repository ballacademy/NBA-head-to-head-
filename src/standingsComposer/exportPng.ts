import {
  downloadPngMaybeSquare,
  toStoryCanvas,
} from "../instagramComposer/exportDownload";
import {
  renderStandingsCanvas,
  type StandingsRenderInput,
} from "./renderStandingsCanvas";

export { exportFilename } from "./rankingState";

export const exportStandingsPng = async (
  _node: HTMLElement,
  filename: string,
  input: StandingsRenderInput,
  story = false,
  square = false,
) => {
  const canvas = await renderStandingsCanvas(input, 2);
  const board = story ? await toStoryCanvas(canvas) : canvas;
  await downloadPngMaybeSquare(board, filename, square);
};
