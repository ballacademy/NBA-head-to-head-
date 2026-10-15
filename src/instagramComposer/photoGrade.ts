import { useEffect, useState } from "react";
import { readJson, writeJson } from "../lib/browserStorage";

export const PHOTO_GRADE_KEY = "ddgm:composer-photo-grade";

/**
 * Preview CSS filter — contrast, cleaner whites, slight saturation.
 * Canvas export uses the same string, then a pixel S-curve + unsharp.
 */
export const PHOTO_GRADE_FILTER =
  "contrast(1.42) saturate(1.12) brightness(0.97)";

/** Brighter Stat-card panel when the grade is on (after look ~#f3f3f3). */
export const PHOTO_GRADE_PANEL = "#f3f3f3";

/** Team watermark is quieter on the graded Stat column. */
export const PHOTO_GRADE_WATERMARK = 0.48;

export const parsePhotoGrade = (value: unknown) => value === true;

export const composerGradeClass = (on: boolean) => (on ? "is-grade" : "");

export const readPhotoGrade = () =>
  parsePhotoGrade(readJson<unknown>(PHOTO_GRADE_KEY));

export const writePhotoGrade = (on: boolean) => {
  writeJson(PHOTO_GRADE_KEY, on);
};

export const gradedWatermarkOpacity = (opacity: number, grade?: boolean) =>
  grade ? opacity * PHOTO_GRADE_WATERMARK : opacity;

export const gradePanelFill = (base: string, grade?: boolean) =>
  grade ? PHOTO_GRADE_PANEL : base;

/** Crush shadows, lift a little contrast around midtones, keep whites clean. */
export const gradeChannel = (value: number) => {
  const x = value / 255;
  const mid = 0.46;
  const contrast = 1.34;
  let y = (x - mid) * contrast + mid;
  if (y < 0.4) {
    y *= 0.76 + y * 0.48;
  }
  if (y > 0.74) {
    y = 0.74 + (y - 0.74) * 1.18;
  }
  return Math.max(0, Math.min(255, Math.round(y * 255)));
};

const unsharp = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  amount: number,
) => {
  const copy = new Uint8ClampedArray(data);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = (y * width + x) * 4;
      for (let c = 0; c < 3; c += 1) {
        const center = copy[i + c]!;
        const blur =
          (copy[i - width * 4 + c]! +
            copy[i + width * 4 + c]! +
            copy[i - 4 + c]! +
            copy[i + 4 + c]! +
            center * 4) /
          8;
        data[i + c] = Math.max(
          0,
          Math.min(255, Math.round(center + (center - blur) * amount)),
        );
      }
    }
  }
};

export const gradeImageData = (image: ImageData, clarity = 0.32) => {
  const { data, width, height } = image;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) {
      continue;
    }
    data[i] = gradeChannel(data[i]!);
    data[i + 1] = gradeChannel(data[i + 1]!);
    data[i + 2] = gradeChannel(data[i + 2]!);
  }
  if (clarity > 0 && width > 2 && height > 2) {
    unsharp(data, width, height, clarity);
  }
  return image;
};

/** Punch a photo already drawn into this rect. No-ops on a tainted canvas. */
export const applyPhotoGrade = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  on?: boolean,
) => {
  if (!on || w < 2 || h < 2) {
    return;
  }
  const sx = Math.max(0, Math.round(x));
  const sy = Math.max(0, Math.round(y));
  const sw = Math.max(1, Math.round(w));
  const sh = Math.max(1, Math.round(h));
  try {
    const image = context.getImageData(sx, sy, sw, sh);
    gradeImageData(image);
    context.putImageData(image, sx, sy);
  } catch {
    // CORS-tainted headshots skip the pixel pass; CSS/canvas filter still applies.
  }
};

export const usePhotoGrade = () => {
  const [on, setOn] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setOn(readPhotoGrade());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    writePhotoGrade(on);
  }, [hydrated, on]);

  return [on, setOn] as const;
};
