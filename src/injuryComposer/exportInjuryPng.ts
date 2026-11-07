import { downloadPngMaybeSquare } from "../instagramComposer/exportDownload";
import { renderInjuryCanvas, type InjuryRenderInput } from "./renderInjuryCanvas";

export const exportInjuryPng = async (
  _node: HTMLElement,
  filename: string,
  input: InjuryRenderInput,
  story = false,
  square = false,
) => {
  const canvas = await renderInjuryCanvas({ ...input, story }, 2);
  await downloadPngMaybeSquare(canvas, filename, square);
};
