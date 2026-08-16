import { readJson, writeJson } from "./browserStorage";

const DAILY_ACCOUNT_NUDGE_KEY = "ddgm:daily-account-nudge-dismissed";

export const hasDismissedDailyAccountNudge = () =>
  readJson<{ dismissed?: boolean }>(DAILY_ACCOUNT_NUDGE_KEY)?.dismissed === true;

export const markDailyAccountNudgeDismissed = () => {
  writeJson(DAILY_ACCOUNT_NUDGE_KEY, { dismissed: true });
};

/** Show only when we know the GM is signed out and they have not dismissed. */
export const shouldShowDailyAccountNudge = (options: {
  accountLinked: boolean | null;
}) =>
  options.accountLinked === false && !hasDismissedDailyAccountNudge();
