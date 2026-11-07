import { downloadPngMaybeSquare } from "../instagramComposer/exportDownload";
import {
  renderPlayInCanvas,
  type PlayInRenderInput,
} from "./renderPlayInCanvas";

export const exportPlayInPng = async (
  _node: HTMLElement,
  filename: string,
  input: PlayInRenderInput,
  story = false,
  square = false,
) => {
  const canvas = await renderPlayInCanvas({ ...input, story }, 2);
  await downloadPngMaybeSquare(canvas, filename, square);
};
