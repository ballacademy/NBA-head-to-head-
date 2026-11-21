import { downloadPngMaybeSquare } from "../instagramComposer/exportDownload";
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
  square = false,
) => {
  const canvas = await renderStandingsCanvas({ ...input, story }, 2);
  await downloadPngMaybeSquare(canvas, filename, square);
};
