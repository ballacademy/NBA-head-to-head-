import { downloadCanvasPng } from "../instagramComposer/exportDownload";
import {
  renderPlayInCanvas,
  type PlayInRenderInput,
} from "./renderPlayInCanvas";

export const exportPlayInPng = async (
  _node: HTMLElement,
  filename: string,
  input: PlayInRenderInput,
  story = false,
) => {
  const canvas = await renderPlayInCanvas({ ...input, story }, 2);
  await downloadCanvasPng(canvas, filename);
};
