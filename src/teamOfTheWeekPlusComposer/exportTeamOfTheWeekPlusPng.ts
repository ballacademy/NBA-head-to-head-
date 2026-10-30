import { downloadPngMaybeSquare } from "../instagramComposer/exportDownload";
import {
  renderTeamOfTheWeekPlusCanvas,
  type TeamOfTheWeekPlusRenderInput,
} from "./renderTeamOfTheWeekPlusCanvas";

export const exportTeamOfTheWeekPlusPng = async (
  _node: HTMLElement,
  filename: string,
  input: TeamOfTheWeekPlusRenderInput,
  story = false,
  square = false,
) => {
  const canvas = await renderTeamOfTheWeekPlusCanvas({ ...input, story }, 2);
  await downloadPngMaybeSquare(canvas, filename, square);
};
