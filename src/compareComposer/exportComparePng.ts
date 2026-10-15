import {
  downloadCanvasPng,
  toStoryCanvas,
} from "../instagramComposer/exportDownload";
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
  const canvas = await renderCompareCanvas(input, 2);
  await downloadCanvasPng(
    story ? await toStoryCanvas(canvas) : canvas,
    filename,
  );
};
