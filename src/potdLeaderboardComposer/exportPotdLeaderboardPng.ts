import { downloadPngMaybeSquare } from "../instagramComposer/exportDownload";
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
  const canvas = await renderPotdLeaderboardCanvas({ ...input, story }, 2);
  await downloadPngMaybeSquare(canvas, filename, square);
};
