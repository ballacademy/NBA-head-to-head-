import {
  canvasToPngBlob,
  renderStandingsCanvas,
  type StandingsRenderInput,
} from "./renderStandingsCanvas";

export { exportFilename } from "./rankingState";

export const exportStandingsPng = async (
  _node: HTMLElement,
  filename: string,
  input: StandingsRenderInput,
) => {
  const canvas = await renderStandingsCanvas(input, 2);
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
