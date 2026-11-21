import {
  downloadPngMaybeSquare,
  squareFilename,
  toSquareCanvas,
} from "../instagramComposer/exportDownload";
import { downloadExportPack, storyFilename } from "../instagramComposer/exportPack";
import { bytesFromBlob, downloadZip } from "../instagramComposer/downloadZip";
import { canvasToPngBlob } from "../standingsComposer/renderStandingsCanvas";
import {
  leaderboardPageCount,
  withLeaderboardPage,
} from "./potdLeaderboardState";
import {
  renderPotdLeaderboardCanvas,
  type PotdLeaderboardRenderInput,
} from "./renderPotdLeaderboardCanvas";

export { exportLeaderboardFilename } from "./potdLeaderboardState";

const pngFile = async (canvas: HTMLCanvasElement, name: string) => ({
  name,
  bytes: await bytesFromBlob(await canvasToPngBlob(canvas)),
});

const packStem = (filename: string) => filename.replace(/\.png$/i, "");

export const exportPotdLeaderboardPng = async (
  _node: HTMLElement,
  filename: string,
  input: PotdLeaderboardRenderInput,
  story = false,
  square = false,
) => {
  const pageCount = leaderboardPageCount(input.entries);
  const current = Math.min(
    Math.max(0, input.pageIndex ?? 0),
    pageCount - 1,
  );
  const canvas = await renderPotdLeaderboardCanvas(
    { ...input, story, pageIndex: current },
    2,
  );
  await downloadPngMaybeSquare(
    canvas,
    withLeaderboardPage(filename, current, pageCount),
    square,
  );
  if (pageCount <= 1) {
    return;
  }
  const files = [];
  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    const pageCanvas =
      pageIndex === current
        ? canvas
        : await renderPotdLeaderboardCanvas(
            { ...input, story, pageIndex },
            2,
          );
    const named = withLeaderboardPage(filename, pageIndex, pageCount);
    if (square) {
      files.push(
        await pngFile(
          pageIndex === current
            ? await toSquareCanvas(canvas)
            : await toSquareCanvas(pageCanvas),
          squareFilename(named),
        ),
      );
      continue;
    }
    files.push(await pngFile(pageCanvas, named));
  }
  await downloadZip(`${packStem(filename)}-pages.zip`, files);
};

export const exportPotdLeaderboardPack = async (
  filename: string,
  input: PotdLeaderboardRenderInput,
) => {
  const pageCount = leaderboardPageCount(input.entries);
  if (pageCount <= 1) {
    await downloadExportPack(
      () => renderPotdLeaderboardCanvas({ ...input, pageIndex: 0 }, 2),
      filename,
    );
    return;
  }
  const files = [];
  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    const name = withLeaderboardPage(filename, pageIndex, pageCount);
    const board = await renderPotdLeaderboardCanvas(
      { ...input, pageIndex },
      2,
    );
    files.push(await pngFile(board, name));
    files.push(
      await pngFile(
        await renderPotdLeaderboardCanvas(
          { ...input, story: true, pageIndex },
          2,
        ),
        storyFilename(name),
      ),
    );
    files.push(
      await pngFile(await toSquareCanvas(board), squareFilename(name)),
    );
  }
  await downloadZip(`${packStem(filename)}-pack.zip`, files);
};

export const leaderboardPackExtras = (
  filename: string,
  input: PotdLeaderboardRenderInput,
) => {
  const pageCount = leaderboardPageCount(input.entries);
  return Array.from({ length: pageCount }, (_, pageIndex) => ({
    filename: withLeaderboardPage(filename, pageIndex, pageCount),
    render: () =>
      renderPotdLeaderboardCanvas({ ...input, pageIndex }, 2),
  }));
};
