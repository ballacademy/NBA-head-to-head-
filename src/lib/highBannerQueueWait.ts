import {
  LIVE_OPPONENT_ONLY_MIN_ELO,
  RATING_LABEL,
  requiresLiveOpponentOnly,
} from "./rankedElo";

export { requiresLiveOpponentOnly };

/** Soft ETA copy for 1500+ live-only searches and post-draft queue waits. */
export const getHighBannerSearchWaitMessage = (elapsedSeconds: number) => {
  if (elapsedSeconds < 8) {
    return `At ${LIVE_OPPONENT_ONLY_MIN_ELO}+ ${RATING_LABEL}, you need a live opponent (any rating) — no NPC fallback. Searching…`;
  }

  if (elapsedSeconds < 20) {
    return "Pool is thin at this rating. Hang tight, or cancel and try Practice / Private instead.";
  }

  return "Still searching. You can cancel — if a live GM shows up, they'll still get your queued lineup.";
};

export const getHighBannerQueuedWaitCopy = (params: {
  ratingPointsLabel: string;
}) => ({
  headline: "Your lineup is in the queue",
  body: `Posted at ${params.ratingPointsLabel}. When another live GM (any rating) plays your five you'll see the result on the Play tab — typically within the hour, sometimes a few hours.`,
  tip: "Practice and Private still work while you wait. Live Casual/Pro starts again once this lineup gets a score.",
});

export const getHighBannerQueueLockNote = (modesLabel: string) =>
  `Lineup posted${modesLabel} — waiting for a live opponent (any rating). Result appears on the Play tab when it lands. Practice and Private still work.`;
