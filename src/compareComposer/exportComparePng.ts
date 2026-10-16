import { downloadPngMaybeSquare } from "../instagramComposer/exportDownload";
import {
  renderCompareCanvas,
  type CompareRenderInput,
} from "./renderCompareCanvas";

export const exportComparePng = async (
  _node: HTMLElement,
  filename: string,
  input: CompareRenderInput,
  story = false,
  square = false,
) => {
  const canvas = await renderCompareCanvas({ ...input, story }, 2);
  await downloadPngMaybeSquare(canvas, filename, square);
};
