import { downloadPngMaybeSquare } from "../instagramComposer/exportDownload";
import {
  renderDualRanksCanvas,
  type DualRanksRenderInput,
} from "./renderDualRanksCanvas";

export const exportDualRanksPng = async (
  _node: HTMLElement,
  filename: string,
  input: DualRanksRenderInput,
  story = false,
  square = false,
) => {
  const canvas = await renderDualRanksCanvas({ ...input, story, square }, 2);
  await downloadPngMaybeSquare(canvas, filename, square);
};
