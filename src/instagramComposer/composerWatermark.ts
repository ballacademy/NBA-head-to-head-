export type ComposerWatermark = "off" | "faint" | "medium";

export const COMPOSER_WATERMARK_MODES = ["faint", "medium", "off"] as const;
export const DEFAULT_COMPOSER_WATERMARK: ComposerWatermark = "faint";
export const COMPOSER_WATERMARK_FAINT = 0.12;
export const COMPOSER_WATERMARK_MEDIUM = 0.28;

export const parseComposerWatermark = (value: unknown): ComposerWatermark => {
  if (value === "off") {
    return "off";
  }
  if (value === "medium" || value === "small") {
    return "medium";
  }
  return "faint";
};

export const composerWatermarkOpacity = (mode: ComposerWatermark) => {
  if (mode === "off") {
    return 0;
  }
  return mode === "medium" ? COMPOSER_WATERMARK_MEDIUM : COMPOSER_WATERMARK_FAINT;
};
