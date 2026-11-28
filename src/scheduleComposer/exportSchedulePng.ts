import { downloadPngMaybeSquare } from "../instagramComposer/exportDownload";
import {
  renderScheduleCanvas,
  type ScheduleRenderInput,
} from "./renderScheduleCanvas";

export const exportSchedulePng = async (
  _node: HTMLElement,
  filename: string,
  input: ScheduleRenderInput,
  story = false,
  square = false,
) => {
  const canvas = await renderScheduleCanvas({ ...input, story }, 2);
  await downloadPngMaybeSquare(canvas, filename, square);
};
