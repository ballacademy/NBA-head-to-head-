import { downloadCanvasPng } from "../instagramComposer/exportDownload";
import {
  renderCompareCanvas,
  type CompareRenderInput,
} from "./renderCompareCanvas";

export const exportComparePng = async (
  _node: HTMLElement,
  filename: string,
  input: CompareRenderInput,
  story = false,
) => {
  const canvas = await renderCompareCanvas({ ...input, story }, 2);
  await downloadCanvasPng(canvas, filename);
};
