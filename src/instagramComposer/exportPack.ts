import { downloadCanvasPng, toStoryCanvas } from "./exportDownload";

const wait = (ms: number) =>
  new Promise((resolve) => window.setTimeout(resolve, ms));

export const storyFilename = (filename: string) =>
  filename.replace(/\.png$/i, "") + "-story.png";

export const squareFilename = (filename: string) =>
  filename.replace(/\.png$/i, "") + "-square.png";

/** One click: 4:5 feed PNG, then 9:16 story, then any extra slides. */
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
  for (const extra of extras) {
    await wait(220);
    await downloadCanvasPng(await extra.render(), extra.filename);
  }
};
