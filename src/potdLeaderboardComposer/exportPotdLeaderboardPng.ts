import {
  downloadPngMaybeSquare,
  squareFilename,
  toSquareCanvas,
} from "../instagramComposer/exportDownload";
import { downloadExportPack, storyFilename } from "../instagramComposer/exportPack";
import {
  leaderboardPageCount,
  withLeaderboardPage,
} from "./potdLeaderboardState";
import {
  renderPotdLeaderboardCanvas,
  type PotdLeaderboardRenderInput,
} from "./renderPotdLeaderboardCanvas";

export { exportLeaderboardFilename } from "./potdLeaderboardState";

const wait = (ms: number) =>
  new Promise((resolve) => window.setTimeout(resolve, ms));

export const exportPotdLeaderboardPng = async (
  _node: HTMLElement,
  filename: string,
  input: PotdLeaderboardRenderInput,
  story = false,
  square = false,
) => {
  const pageCount = leaderboardPageCount(input.entries);
  for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
    if (pageIndex > 0) {
      await wait(220);
    }
    const canvas = await renderPotdLeaderboardCanvas(
      { ...input, story, pageIndex },
      2,
    );
    await downloadPngMaybeSquare(
      canvas,
      withLeaderboardPage(filename, pageIndex, pageCount),
      square,
    );
  }
};

export const exportPotdLeaderboardPack = async (
  filename: string,
  input: PotdLeaderboardRenderInput,
) => {
  const pageCount = leaderboardPageCount(input.entries);
  const first = withLeaderboardPage(filename, 0, pageCount);
  const extras: Array<{
    filename: string;
    render: () => Promise<HTMLCanvasElement>;
  }> = [];
  for (let pageIndex = 1; pageIndex < pageCount; pageIndex += 1) {
    const name = withLeaderboardPage(filename, pageIndex, pageCount);
    extras.push({
      filename: name,
      render: () =>
        renderPotdLeaderboardCanvas({ ...input, pageIndex }, 2),
    });
    extras.push({
      filename: storyFilename(name),
      render: () =>
        renderPotdLeaderboardCanvas(
          { ...input, story: true, pageIndex },
          2,
        ),
    });
    extras.push({
      filename: squareFilename(name),
      render: async () =>
        toSquareCanvas(
          await renderPotdLeaderboardCanvas({ ...input, pageIndex }, 2),
        ),
    });
  }
  await downloadExportPack(
    () => renderPotdLeaderboardCanvas({ ...input, pageIndex: 0 }, 2),
    first,
    extras,
  );
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
