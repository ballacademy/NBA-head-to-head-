import {
  downloadPngMaybeSquare,
  toStoryCanvas,
} from "../instagramComposer/exportDownload";
import {
  renderPotdLeaderboardCanvas,
  type PotdLeaderboardRenderInput,
} from "./renderPotdLeaderboardCanvas";

export { exportLeaderboardFilename } from "./potdLeaderboardState";

export const exportPotdLeaderboardPng = async (
  _node: HTMLElement,
  filename: string,
  input: PotdLeaderboardRenderInput,
  story = false,
  square = false,
) => {
  const canvas = await renderPotdLeaderboardCanvas(input, 2);
  const board = story ? await toStoryCanvas(canvas) : canvas;
  await downloadPngMaybeSquare(board, filename, square);
};
