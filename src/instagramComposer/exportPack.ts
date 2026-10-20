import {
  downloadCanvasPng,
  squareFilename,
  toSquareCanvas,
  toStoryCanvas,
} from "./exportDownload";

export { squareFilename } from "./exportDownload";

const wait = (ms: number) =>
  new Promise((resolve) => window.setTimeout(resolve, ms));

export const storyFilename = (filename: string) =>
  filename.replace(/\.png$/i, "") + "-story.png";

/** One click: 4:5 feed PNG, then 9:16 story, then 1:1, then any extra slides. */
export const downloadExportPack = async (
  render: () => Promise<HTMLCanvasElement>,
  filename: string,
  extras: Array<{
    filename: string;
    render: () => Promise<HTMLCanvasElement>;
  }> = [],
  story: { safe?: boolean; letterbox?: boolean } = {},
) => {
  const board = await render();
  await downloadCanvasPng(board, filename);
  if (story.letterbox !== false) {
    await wait(220);
    await downloadCanvasPng(
      await toStoryCanvas(board, story),
      storyFilename(filename),
    );
  }
  await wait(220);
  await downloadCanvasPng(await toSquareCanvas(board), squareFilename(filename));
  for (const extra of extras) {
    await wait(220);
    await downloadCanvasPng(await extra.render(), extra.filename);
  }
};
