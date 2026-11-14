import { downloadPngMaybeSquare } from "../instagramComposer/exportDownload";
import { renderPicksCanvas, type PicksRenderInput } from "./renderPicksCanvas";

export const exportPicksPng = async (
  _node: HTMLElement,
  filename: string,
  input: PicksRenderInput,
  story = false,
  square = false,
) => {
  const canvas = await renderPicksCanvas({ ...input, story }, 2);
  await downloadPngMaybeSquare(canvas, filename, square);
};
