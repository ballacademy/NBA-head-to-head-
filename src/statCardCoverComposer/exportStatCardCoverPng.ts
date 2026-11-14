import { downloadPngMaybeSquare } from "../instagramComposer/exportDownload";
import {
  renderStatCardCoverCanvas,
  type StatCardCoverRenderInput,
} from "./renderStatCardCoverCanvas";

export const exportStatCardCoverPng = async (
  _node: HTMLElement,
  filename: string,
  input: StatCardCoverRenderInput,
  story = false,
  square = false,
) => {
  const canvas = await renderStatCardCoverCanvas(
    { ...input, story },
    2,
  );
  await downloadPngMaybeSquare(canvas, filename, square);
};
