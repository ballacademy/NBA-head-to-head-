import { exportFilenameFromTitle } from "../instagramComposer/composerPresets";
import { bytesFromBlob, downloadZip } from "../instagramComposer/downloadZip";
import {
  downloadPngMaybeSquare,
  squareFilename,
  toSquareCanvas,
  toStoryCanvas,
} from "../instagramComposer/exportDownload";
import { storyFilename } from "../instagramComposer/exportPack";
import { graphicCaption } from "../instagramComposer/graphicCaption";
import { canvasToPngBlob } from "../standingsComposer/renderStandingsCanvas";
import { renderTakeawaysCardCanvas } from "./renderTakeawaysCardCanvas";
import {
  renderTakeawaysCoverCanvas,
  type TakeawaysRenderInput,
} from "./renderTakeawaysCoverCanvas";
import {
  takeawaysCaptionLines,
  takeawaysCardName,
  takeawaysWeekPill,
  visibleTakeawaysCards,
} from "./takeawaysState";

const pngFile = async (canvas: HTMLCanvasElement, name: string) => ({
  name,
  bytes: await bytesFromBlob(await canvasToPngBlob(canvas)),
});

export const exportTakeawaysCoverPng = async (
  _node: HTMLElement,
  filename: string,
  input: TakeawaysRenderInput,
  story = false,
  square = false,
) => {
  const canvas = await renderTakeawaysCoverCanvas({ ...input, story }, 2);
  await downloadPngMaybeSquare(canvas, filename, square);
};

export const exportTakeawaysCardPng = async (
  _node: HTMLElement,
  filename: string,
  input: TakeawaysRenderInput,
  story = false,
  square = false,
) => {
  const canvas = await renderTakeawaysCardCanvas({ ...input, story }, 2);
  await downloadPngMaybeSquare(canvas, filename, square);
};

export const exportTakeawaysCarouselZip = async (input: TakeawaysRenderInput) => {
  const week = takeawaysWeekPill(input);
  const stem = exportFilenameFromTitle(
    `${input.title || "NBA TAKEAWAYS"} ${week}`,
    "takeaways",
    input.from,
  );
  const files: Array<{ name: string; bytes: Uint8Array }> = [];
  const cover = await renderTakeawaysCoverCanvas(input, 2);
  files.push(await pngFile(cover, stem));
  files.push(await pngFile(await toStoryCanvas(cover), storyFilename(stem)));
  files.push(await pngFile(await toSquareCanvas(cover), squareFilename(stem)));
  const cards = visibleTakeawaysCards(input.cards, true);
  for (let index = 0; index < input.cards.length; index += 1) {
    const card = input.cards[index]!;
    if (!cards.includes(card)) {
      continue;
    }
    const name = exportFilenameFromTitle(
      takeawaysCardName(card) || `takeaway-${index + 1}`,
      "takeaways",
      input.from,
    );
    const board = await renderTakeawaysCardCanvas(input, 2, index);
    files.push(await pngFile(board, name));
    files.push(await pngFile(await toStoryCanvas(board), storyFilename(name)));
    files.push(await pngFile(await toSquareCanvas(board), squareFilename(name)));
  }
  files.push({
    name: "caption.txt",
    bytes: new TextEncoder().encode(
      graphicCaption(
        input.title,
        takeawaysCaptionLines(input).slice(1),
        [week, input.rangeLine],
      ),
    ),
  });
  await downloadZip(stem.replace(/\.png$/i, "-carousel.zip"), files);
};
