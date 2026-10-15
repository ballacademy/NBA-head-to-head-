import {
  downloadCanvasPng,
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
) => {
  const canvas = await renderPotdLeaderboardCanvas(input, 2);
  await downloadCanvasPng(story ? await toStoryCanvas(canvas) : canvas, filename);
};
