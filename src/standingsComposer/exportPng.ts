import {
  downloadCanvasPng,
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
) => {
  const canvas = await renderStandingsCanvas(input, 2);
  await downloadCanvasPng(story ? await toStoryCanvas(canvas) : canvas, filename);
};
