import { readJson, writeJson } from "./browserStorage";

const LIMITED_SAMPLE_EXPLAINER_SEEN_KEY =
  "ddgm:limited-sample-explainer-seen:v1";

export const LIMITED_SAMPLE_TOOLTIP_COPY =
  "Few games played — rating stays conservative.";

export const hasSeenLimitedSampleExplainer = () =>
  readJson<{ seen?: boolean }>(LIMITED_SAMPLE_EXPLAINER_SEEN_KEY)?.seen ===
  true;

export const markLimitedSampleExplainerSeen = () => {
  writeJson(LIMITED_SAMPLE_EXPLAINER_SEEN_KEY, { seen: true });
};
