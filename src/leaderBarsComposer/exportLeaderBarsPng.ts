import { downloadPngMaybeSquare } from "../instagramComposer/exportDownload";
import {
  renderLeaderBarsCanvas,
  type LeaderBarsRenderInput,
} from "./renderLeaderBarsCanvas";

export const exportLeaderBarsPng = async (
  _node: HTMLElement,
  filename: string,
  input: LeaderBarsRenderInput,
  story = false,
  square = false,
) => {
  const canvas = await renderLeaderBarsCanvas(
    { ...input, story, square },
    2,
  );
  await downloadPngMaybeSquare(canvas, filename, square);
};
