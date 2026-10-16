import { useEffect, useState } from "react";
import { readJson, writeJson } from "../lib/browserStorage";

export const PHOTO_GRADE_KEY = "ddgm:composer-photo-grade";
export const PHOTO_GRADE_INTENSITY_KEY = "ddgm:composer-photo-grade-intensity";

/**
 * Preview CSS filter — contrast, cleaner whites, slight saturation.
 * Canvas export uses the same string, then a pixel S-curve + unsharp.
 */
export const clampPhotoGradeIntensity = (value: unknown) => {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(n)));
};

export const photoGradeFilter = (intensity = 100) => {
  const t = clampPhotoGradeIntensity(intensity) / 100;
  const contrast = 1 + 0.42 * t;
  const saturate = 1 + 0.12 * t;
  const brightness = 1 - 0.03 * t;
  return `contrast(${contrast}) saturate(${saturate}) brightness(${brightness})`;
};

export const PHOTO_GRADE_FILTER = photoGradeFilter(100);

const applyPhotoGradeCssVars = (intensity: number) => {
  if (typeof document === "undefined") {
    return;
  }
  const t = clampPhotoGradeIntensity(intensity) / 100;
  document.documentElement.style.setProperty(
    "--photo-grade-filter",
    photoGradeFilter(intensity),
  );
  document.documentElement.style.setProperty(
    "--photo-grade-vignette-mid",
    String(0.16 * t),
  );
  document.documentElement.style.setProperty(
    "--photo-grade-vignette-edge",
    String(0.58 * t),
  );
};

/** Canvas drawImage filter — scales with the HUD slider, not a 100% crush. */
export const canvasGradeFilter = (on?: boolean) => {
  if (!on) {
    return "none";
  }
  const intensity = readPhotoGradeIntensity();
  return intensity > 0 ? photoGradeFilter(intensity) : "none";
};

/** Brighter Stat-card panel when the grade is on (after look ~#f3f3f3). */
export const PHOTO_GRADE_PANEL = "#f3f3f3";

/** Team watermark is quieter on the graded Stat column. */
export const PHOTO_GRADE_WATERMARK = 0.48;

export const parsePhotoGrade = (value: unknown) => value === true;

export const composerGradeClass = (on: boolean) => (on ? "is-grade" : "");

export const readPhotoGradeIntensity = () => {
  const stored = readJson<unknown>(PHOTO_GRADE_INTENSITY_KEY);
  if (typeof stored === "number" || typeof stored === "string") {
    return clampPhotoGradeIntensity(stored);
  }
  return parsePhotoGrade(readJson<unknown>(PHOTO_GRADE_KEY)) ? 100 : 0;
};

export const writePhotoGradeIntensity = (intensity: number) => {
  const next = clampPhotoGradeIntensity(intensity);
  writeJson(PHOTO_GRADE_INTENSITY_KEY, next);
  writeJson(PHOTO_GRADE_KEY, next > 0);
  applyPhotoGradeCssVars(next);
};

export const readPhotoGrade = () => readPhotoGradeIntensity() > 0;

export const writePhotoGrade = (on: boolean) => {
  writePhotoGradeIntensity(on ? readPhotoGradeIntensity() || 100 : 0);
};

export const gradedWatermarkOpacity = (opacity: number, grade?: boolean) =>
  grade ? opacity * PHOTO_GRADE_WATERMARK : opacity;

export const gradePanelFill = (base: string, grade?: boolean) =>
  grade ? PHOTO_GRADE_PANEL : base;

/** Crush shadows, lift a little contrast around midtones, keep whites clean. */
export const gradeChannel = (value: number, intensity = 100) => {
  const t = clampPhotoGradeIntensity(intensity) / 100;
  if (t <= 0) {
    return value;
  }
  const x = value / 255;
  const mid = 0.46;
  const contrast = 1 + 0.34 * t;
  let y = (x - mid) * contrast + mid;
  if (y < 0.4) {
    const crushed = y * (0.76 + y * 0.48);
    y += (crushed - y) * t;
  }
  if (y > 0.74) {
    const lifted = 0.74 + (y - 0.74) * 1.18;
    y += (lifted - y) * t;
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

export const gradeImageData = (
  image: ImageData,
  clarity = 0.32,
  intensity = 100,
) => {
  const { data, width, height } = image;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) {
      continue;
    }
    data[i] = gradeChannel(data[i]!, intensity);
    data[i + 1] = gradeChannel(data[i + 1]!, intensity);
    data[i + 2] = gradeChannel(data[i + 2]!, intensity);
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
  const intensity = readPhotoGradeIntensity();
  if (!on || intensity <= 0 || w < 2 || h < 2) {
    return;
  }
  const sx = Math.max(0, Math.round(x));
  const sy = Math.max(0, Math.round(y));
  const sw = Math.max(1, Math.round(w));
  const sh = Math.max(1, Math.round(h));
  try {
    const image = context.getImageData(sx, sy, sw, sh);
    gradeImageData(image, 0.32 * (intensity / 100), intensity);
    context.putImageData(image, sx, sy);
  } catch {
    // CORS-tainted headshots skip the pixel pass; CSS/canvas filter still applies.
  }
};

export const usePhotoGrade = () => {
  const [intensity, setIntensity] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const on = intensity > 0;

  useEffect(() => {
    const next = readPhotoGradeIntensity();
    setIntensity(next);
    setHydrated(true);
    applyPhotoGradeCssVars(next);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    writePhotoGradeIntensity(intensity);
  }, [hydrated, intensity]);

  const setOn = (next: boolean) => {
    setIntensity((current) => {
      if (!next) {
        return 0;
      }
      return current > 0 ? current : 100;
    });
  };

  return [on, setOn, intensity, setIntensity] as const;
};
