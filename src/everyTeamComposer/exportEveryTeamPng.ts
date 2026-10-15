import {
  downloadCanvasPng,
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
) => {
  const canvas = await renderEveryTeamCanvas(input, 2);
  await downloadCanvasPng(story ? await toStoryCanvas(canvas) : canvas, filename);
};
