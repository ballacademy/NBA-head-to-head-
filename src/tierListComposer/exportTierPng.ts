import { downloadPngMaybeSquare } from "../instagramComposer/exportDownload";
import {
  renderTierListCanvas,
  type TierListRenderInput,
} from "./renderTierListCanvas";

export { exportTierFilename } from "./tierState";

export const exportTierListPng = async (
  _node: HTMLElement,
  filename: string,
  input: TierListRenderInput,
  story = false,
  square = false,
) => {
  const canvas = await renderTierListCanvas({ ...input, story }, 2);
  await downloadPngMaybeSquare(canvas, filename, square);
};
