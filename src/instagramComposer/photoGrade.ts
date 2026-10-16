import { useEffect, useState } from "react";
import { readJson, writeJson } from "../lib/browserStorage";

export const PHOTO_GRADE_KEY = "ddgm:composer-photo-grade";
export const PHOTO_GRADE_INTENSITY_KEY = "ddgm:composer-photo-grade-intensity";
export const PHOTO_GRADE_MIX_KEY = "ddgm:composer-photo-grade-mix";

export type PhotoGradeMix = {
  structure: number;
  sharpness: number;
  high: number;
  mid: number;
  low: number;
  protect: number;
};

export const PHOTO_GRADE_MIX_KEYS = [
  "structure",
  "sharpness",
  "high",
  "mid",
  "low",
  "protect",
] as const;

export const DEFAULT_PHOTO_GRADE_MIX: PhotoGradeMix = {
  structure: 100,
  sharpness: 100,
  high: 100,
  mid: 100,
  low: 100,
  protect: 100,
};

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

/** Ease so 1–4 is a slight lift and high values punch. Linear 1–4 used to look identical. */
export const photoGradeRamp = (intensity = 0) => {
  const t = clampPhotoGradeIntensity(intensity) / 100;
  if (t <= 0) {
    return 0;
  }
  return t ** 0.55;
};

export const parsePhotoGradeMix = (value: unknown): PhotoGradeMix => {
  const raw =
    value && typeof value === "object" ? (value as Partial<PhotoGradeMix>) : {};
  const mix = { ...DEFAULT_PHOTO_GRADE_MIX };
  for (const key of PHOTO_GRADE_MIX_KEYS) {
    mix[key] = clampPhotoGradeIntensity(raw[key] ?? 100);
  }
  return mix;
};

export const readPhotoGradeMix = () =>
  parsePhotoGradeMix(readJson<unknown>(PHOTO_GRADE_MIX_KEY));

export const writePhotoGradeMix = (mix: PhotoGradeMix) => {
  const next = parsePhotoGradeMix(mix);
  writeJson(PHOTO_GRADE_MIX_KEY, next);
  applyPhotoGradeCssVars(readPhotoGradeIntensity(), next);
};

const mixAmount = (mix: PhotoGradeMix, key: keyof PhotoGradeMix, ramp: number) =>
  (clampPhotoGradeIntensity(mix[key]) / 100) * ramp;

export const photoGradeFilter = (
  intensity = 100,
  mix: PhotoGradeMix = DEFAULT_PHOTO_GRADE_MIX,
) => {
  const r = photoGradeRamp(intensity);
  const structure = mixAmount(mix, "structure", r);
  const contrast = 1 + 0.78 * structure;
  const saturate = 1 + 0.16 * r;
  const brightness = 1 + 0.04 * r;
  return `contrast(${contrast}) saturate(${saturate}) brightness(${brightness})`;
};

export const PHOTO_GRADE_FILTER = photoGradeFilter(100);

const applyPhotoGradeCssVars = (
  intensity: number,
  mix: PhotoGradeMix = DEFAULT_PHOTO_GRADE_MIX,
) => {
  if (typeof document === "undefined") {
    return;
  }
  const r = photoGradeRamp(intensity);
  document.documentElement.style.setProperty(
    "--photo-grade-filter",
    photoGradeFilter(intensity, mix),
  );
  document.documentElement.style.setProperty(
    "--photo-grade-vignette-mid",
    String(0.1 * r),
  );
  document.documentElement.style.setProperty(
    "--photo-grade-vignette-edge",
    String(0.34 * r),
  );
};

/** Canvas drawImage filter — scales with the HUD slider, not a 100% crush. */
export const canvasGradeFilter = (on?: boolean) => {
  if (!on) {
    return "none";
  }
  const intensity = readPhotoGradeIntensity();
  return intensity > 0 ? photoGradeFilter(intensity, readPhotoGradeMix()) : "none";
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
  applyPhotoGradeCssVars(next, readPhotoGradeMix());
};

export const readPhotoGrade = () => readPhotoGradeIntensity() > 0;

export const writePhotoGrade = (on: boolean) => {
  writePhotoGradeIntensity(on ? readPhotoGradeIntensity() || 100 : 0);
};

export const gradedWatermarkOpacity = (opacity: number, grade?: boolean) =>
  grade ? opacity * PHOTO_GRADE_WATERMARK : opacity;

export const gradePanelFill = (base: string, grade?: boolean) =>
  grade ? PHOTO_GRADE_PANEL : base;

/**
 * Lift structure across high/mid/low tones. Protect shadows so blacks
 * never crush; low intensity is a slight lift, high is strong.
 */
export const gradeChannel = (
  value: number,
  intensity = 100,
  mix: PhotoGradeMix = DEFAULT_PHOTO_GRADE_MIX,
) => {
  const r = photoGradeRamp(intensity);
  if (r <= 0) {
    return value;
  }
  const x = value / 255;
  const structure = mixAmount(mix, "structure", r);
  const high = mixAmount(mix, "high", r);
  const mid = mixAmount(mix, "mid", r);
  const low = mixAmount(mix, "low", r);
  const protect = mixAmount(mix, "protect", r);

  const curved = 0.5 + (x - 0.5) * (1 + 0.62 * structure);
  let y = x;
  if (x < 0.34) {
    y = x + (curved - x) * (0.28 + 0.72 * low);
  } else if (x < 0.68) {
    y = x + (curved - x) * (0.34 + 0.66 * mid);
  } else {
    y = x + (curved - x) * (0.3 + 0.7 * high);
    y += (1 - y) * 0.05 * high;
  }

  if (x < 0.22) {
    const floor = x + (0.028 + x * 0.06) * protect;
    y = Math.max(y, floor);
    if (y < x) {
      y = x + (y - x) * (1 - protect);
    }
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
  mix: PhotoGradeMix = DEFAULT_PHOTO_GRADE_MIX,
) => {
  const { data, width, height } = image;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) {
      continue;
    }
    data[i] = gradeChannel(data[i]!, intensity, mix);
    data[i + 1] = gradeChannel(data[i + 1]!, intensity, mix);
    data[i + 2] = gradeChannel(data[i + 2]!, intensity, mix);
  }
  const r = photoGradeRamp(intensity);
  const amount =
    clarity > 0
      ? clarity
      : 0.2 * mixAmount(mix, "sharpness", r) + 0.16 * mixAmount(mix, "structure", r);
  if (amount > 0 && width > 2 && height > 2) {
    unsharp(data, width, height, amount);
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
  const mix = readPhotoGradeMix();
  if (!on || intensity <= 0 || w < 2 || h < 2) {
    return;
  }
  const sx = Math.max(0, Math.round(x));
  const sy = Math.max(0, Math.round(y));
  const sw = Math.max(1, Math.round(w));
  const sh = Math.max(1, Math.round(h));
  try {
    const image = context.getImageData(sx, sy, sw, sh);
    const r = photoGradeRamp(intensity);
    const clarity =
      0.22 * mixAmount(mix, "sharpness", r) + 0.14 * mixAmount(mix, "structure", r);
    gradeImageData(image, clarity, intensity, mix);
    context.putImageData(image, sx, sy);
  } catch {
    // CORS-tainted headshots skip the pixel pass; CSS/canvas filter still applies.
  }
};

export const usePhotoGrade = () => {
  const [intensity, setIntensity] = useState(0);
  const [mix, setMix] = useState<PhotoGradeMix>(DEFAULT_PHOTO_GRADE_MIX);
  const [hydrated, setHydrated] = useState(false);
  const on = intensity > 0;

  useEffect(() => {
    const next = readPhotoGradeIntensity();
    const nextMix = readPhotoGradeMix();
    setIntensity(next);
    setMix(nextMix);
    setHydrated(true);
    applyPhotoGradeCssVars(next, nextMix);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    writePhotoGradeIntensity(intensity);
  }, [hydrated, intensity]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    writePhotoGradeMix(mix);
    applyPhotoGradeCssVars(intensity, mix);
  }, [hydrated, mix, intensity]);

  const setOn = (next: boolean) => {
    setIntensity((current) => {
      if (!next) {
        return 0;
      }
      return current > 0 ? current : 100;
    });
  };

  return [on, setOn, intensity, setIntensity, mix, setMix] as const;
};
