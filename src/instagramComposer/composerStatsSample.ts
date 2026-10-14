import { useEffect, useState } from "react";
import { readJson, writeJson } from "../lib/browserStorage";

export type ComposerStatsSample = "preseason" | "regular";

export const COMPOSER_STATS_SAMPLE_KEY = "ddgm:composer-stats-sample";

export const parseComposerStatsSample = (
  value: unknown,
): ComposerStatsSample => (value === "regular" ? "regular" : "preseason");

export const composerStatsSampleLabel = (sample: ComposerStatsSample) =>
  sample === "preseason" ? "Preseason" : "Regular season";

export const useComposerStatsSample = () => {
  const [sample, setSample] = useState<ComposerStatsSample>("preseason");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSample(parseComposerStatsSample(readJson(COMPOSER_STATS_SAMPLE_KEY)));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    writeJson(COMPOSER_STATS_SAMPLE_KEY, sample);
  }, [hydrated, sample]);

  return [sample, setSample] as const;
};
