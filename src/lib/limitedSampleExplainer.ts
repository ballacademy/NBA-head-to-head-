import { readJson, writeJson } from "./browserStorage";

const LIMITED_SAMPLE_EXPLAINER_SEEN_KEY =
  "ddgm:limited-sample-explainer-seen:v1";

export const LIMITED_SAMPLE_TOOLTIP_COPY =
  "Limited sample (<30 games this season): stats may stay conservative and can blend in prior-season production.";

export const hasSeenLimitedSampleExplainer = () =>
  readJson<{ seen?: boolean }>(LIMITED_SAMPLE_EXPLAINER_SEEN_KEY)?.seen ===
  true;

export const markLimitedSampleExplainerSeen = () => {
  writeJson(LIMITED_SAMPLE_EXPLAINER_SEEN_KEY, { seen: true });
};
