import {
  canvasToPngBlob,
  renderEveryTeamCanvas,
  type EveryTeamRenderInput,
} from "./renderEveryTeamCanvas";

export { exportEveryTeamFilename } from "./everyTeamState";

export const exportEveryTeamPng = async (
  _node: HTMLElement,
  filename: string,
  input: EveryTeamRenderInput,
) => {
  const canvas = await renderEveryTeamCanvas(input, 2);
  const blob = await canvasToPngBlob(canvas);
  const objectUrl = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.download = filename;
    link.href = objectUrl;
    link.click();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
  }
};
