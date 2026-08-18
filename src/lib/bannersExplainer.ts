import { readJson, writeJson } from "./browserStorage";

const BANNERS_EXPLAINER_SEEN_KEY = "ddgm:banners-explainer-seen:v1";

export const hasSeenBannersExplainer = () =>
  readJson<{ seen?: boolean }>(BANNERS_EXPLAINER_SEEN_KEY)?.seen === true;

export const markBannersExplainerSeen = () => {
  writeJson(BANNERS_EXPLAINER_SEEN_KEY, { seen: true });
};

export const BANNERS_EXPLAINER_COPY =
  "Banners are your Front Office rating — they move you on the Casual and Pro season boards.";
