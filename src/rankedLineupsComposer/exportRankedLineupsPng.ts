import { downloadCanvasPng } from "../instagramComposer/exportDownload";
import {
  renderRankedLineupsCanvas,
  type RankedLineupsRenderInput,
} from "./renderRankedLineupsCanvas";

export const exportRankedLineupsPng = async (
  _node: HTMLElement,
  filename: string,
  input: RankedLineupsRenderInput,
  story = false,
) => {
  const canvas = await renderRankedLineupsCanvas({ ...input, story }, 2);
  await downloadCanvasPng(canvas, filename);
};
