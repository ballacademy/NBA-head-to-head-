import { readJson, writeJson } from "./browserStorage";

/** Bump when first-session guide copy/structure changes materially. */
const FIRST_SESSION_SEEN_KEY = "ddgm:first-session-guide-seen:v3";

export const hasSeenFirstSessionGuide = () =>
  readJson<{ seen?: boolean }>(FIRST_SESSION_SEEN_KEY)?.seen === true;

export const markFirstSessionGuideSeen = () => {
  writeJson(FIRST_SESSION_SEEN_KEY, { seen: true });
};

export const clearFirstSessionGuideSeen = () => {
  writeJson(FIRST_SESSION_SEEN_KEY, { seen: false });
};
