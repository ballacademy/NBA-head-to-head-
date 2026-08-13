import { readJson, writeJson } from "./browserStorage";

/** Bump when hub guide copy/structure changes materially. */
const HUB_GUIDE_SEEN_KEY = "ddgm:hub-guide-seen:v2";

export const hasSeenHubGuide = () =>
  readJson<{ seen?: boolean }>(HUB_GUIDE_SEEN_KEY)?.seen === true;

export const markHubGuideSeen = () => {
  writeJson(HUB_GUIDE_SEEN_KEY, { seen: true });
};

export const clearHubGuideSeen = () => {
  writeJson(HUB_GUIDE_SEEN_KEY, { seen: false });
};
