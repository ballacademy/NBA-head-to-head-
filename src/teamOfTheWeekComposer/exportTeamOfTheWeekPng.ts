import { downloadPngMaybeSquare } from "../instagramComposer/exportDownload";
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
  const canvas = await renderTeamOfTheWeekCanvas({ ...input, story }, 2);
  await downloadPngMaybeSquare(canvas, filename, square);
};
