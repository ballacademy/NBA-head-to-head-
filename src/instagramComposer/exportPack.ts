import { canvasToPngBlob } from "../standingsComposer/renderStandingsCanvas";
import { bytesFromBlob, downloadZip } from "./downloadZip";
import {
  composerShowsStamp,
  paintComposerStamp,
  readComposerStamp,
} from "./composerStamp";
import { getComposerExportContext } from "./composerRecents";
import {
  squareFilename,
  toSquareCanvas,
  toStoryCanvas,
} from "./exportDownload";

export { squareFilename } from "./exportDownload";

export const storyFilename = (filename: string) =>
  filename.replace(/\.png$/i, "") + "-story.png";

const packZipName = (filename: string) =>
  filename.replace(/\.png$/i, "") + "-pack.zip";

const stampedCanvas = (canvas: HTMLCanvasElement) => {
  const mode = getComposerExportContext();
  const stamp = readComposerStamp();
  if (!mode || !composerShowsStamp(mode) || !stamp.on) {
    return canvas;
  }
  const copy = document.createElement("canvas");
  copy.width = canvas.width;
  copy.height = canvas.height;
  const context = copy.getContext("2d");
  if (!context) {
    return canvas;
  }
  context.drawImage(canvas, 0, 0);
  paintComposerStamp(context, copy.width, copy.height, stamp);
  return copy;
};

const pngBytes = async (canvas: HTMLCanvasElement) =>
  bytesFromBlob(await canvasToPngBlob(stampedCanvas(canvas)));

/** One click: one `-pack.zip` with 4:5, 9:16, 1:1, then any extra slides. */
export const downloadExportPack = async (
  render: () => Promise<HTMLCanvasElement>,
  filename: string,
  extras: Array<{
    filename: string;
    render: () => Promise<HTMLCanvasElement>;
  }> = [],
  story: { safe?: boolean; letterbox?: boolean; squareLetterbox?: boolean } = {},
) => {
  const board = await render();
  const files: Array<{ name: string; bytes: Uint8Array }> = [
    { name: filename, bytes: await pngBytes(board) },
  ];
  if (story.letterbox !== false) {
    files.push({
      name: storyFilename(filename),
      bytes: await pngBytes(await toStoryCanvas(board, story)),
    });
  }
  if (story.squareLetterbox !== false) {
    files.push({
      name: squareFilename(filename),
      bytes: await pngBytes(await toSquareCanvas(board)),
    });
  }
  for (const extra of extras) {
    files.push({
      name: extra.filename,
      bytes: await pngBytes(await extra.render()),
    });
  }
  await downloadZip(packZipName(filename), files);
};
