import {
  downloadCanvasPng,
  toStoryCanvas,
} from "../instagramComposer/exportDownload";
import {
  renderTeamOfTheWeekCanvas,
  type TeamOfTheWeekRenderInput,
} from "./renderTeamOfTheWeekCanvas";

export const exportTeamOfTheWeekPng = async (
  _node: HTMLElement,
  filename: string,
  input: TeamOfTheWeekRenderInput,
  story = false,
) => {
  const canvas = await renderTeamOfTheWeekCanvas(input, 2);
  await downloadCanvasPng(
    story ? await toStoryCanvas(canvas) : canvas,
    filename,
  );
};
