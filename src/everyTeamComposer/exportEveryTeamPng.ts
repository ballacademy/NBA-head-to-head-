import {
  downloadPngMaybeSquare,
  toStoryCanvas,
} from "../instagramComposer/exportDownload";
import {
  renderEveryTeamCanvas,
  type EveryTeamRenderInput,
} from "./renderEveryTeamCanvas";

export { exportEveryTeamFilename } from "./everyTeamState";

export const exportEveryTeamPng = async (
  _node: HTMLElement,
  filename: string,
  input: EveryTeamRenderInput,
  story = false,
  square = false,
) => {
  const canvas = await renderEveryTeamCanvas(input, 2);
  const board = story ? await toStoryCanvas(canvas) : canvas;
  await downloadPngMaybeSquare(board, filename, square);
};
