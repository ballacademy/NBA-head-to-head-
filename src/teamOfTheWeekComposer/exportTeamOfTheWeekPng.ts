import {
  downloadPngMaybeSquare,
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
  square = false,
) => {
  const canvas = await renderTeamOfTheWeekCanvas(input, 2);
  const board = story ? await toStoryCanvas(canvas) : canvas;
  await downloadPngMaybeSquare(board, filename, square);
};
