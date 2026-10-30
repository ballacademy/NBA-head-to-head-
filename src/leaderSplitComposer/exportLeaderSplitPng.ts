import { downloadPngMaybeSquare } from "../instagramComposer/exportDownload";
import {
  renderLeaderSplitCanvas,
  type LeaderSplitRenderInput,
} from "./renderLeaderSplitCanvas";

export const exportLeaderSplitPng = async (
  _node: HTMLElement,
  filename: string,
  input: LeaderSplitRenderInput,
  story = false,
  square = false,
) => {
  const canvas = await renderLeaderSplitCanvas(
    { ...input, story, square },
    2,
  );
  await downloadPngMaybeSquare(canvas, filename, square);
};
