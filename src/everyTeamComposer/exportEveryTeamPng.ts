import { downloadPngMaybeSquare } from "../instagramComposer/exportDownload";
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
  const canvas = await renderEveryTeamCanvas({ ...input, story }, 2);
  await downloadPngMaybeSquare(canvas, filename, square);
};
