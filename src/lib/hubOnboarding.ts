import { readJson, writeJson } from "./browserStorage";

const HUB_GUIDE_SEEN_KEY = "ddgm:hub-guide-seen";

export const hasSeenHubGuide = () =>
  readJson<{ seen?: boolean }>(HUB_GUIDE_SEEN_KEY)?.seen === true;

export const markHubGuideSeen = () => {
  writeJson(HUB_GUIDE_SEEN_KEY, { seen: true });
};
