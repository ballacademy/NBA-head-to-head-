import {
  LIVE_OPPONENT_ONLY_MIN_ELO,
  RATING_LABEL,
  requiresLiveOpponentOnly,
} from "./rankedElo";

export { requiresLiveOpponentOnly };

/** Soft ETA copy for 1500+ live-only searches and post-draft queue waits. */
export const getHighBannerSearchWaitMessage = (elapsedSeconds: number) => {
  if (elapsedSeconds < 8) {
    return `At ${LIVE_OPPONENT_ONLY_MIN_ELO}+ ${RATING_LABEL}, you only face live or saved opponents — searching near your rating…`;
  }

  if (elapsedSeconds < 20) {
    return "Live pool can be thin at this tier. Hang tight, or cancel and use Practice / Private while you wait.";
  }

  return "Still searching. If nobody joins, you'll draft once and your lineup queues until another GM plays it.";
};

export const getHighBannerQueuedWaitCopy = (params: {
  ratingPointsLabel: string;
}) => ({
  headline: "Waiting for a live opponent",
  body: `At ${LIVE_OPPONENT_ONLY_MIN_ELO}+ ${RATING_LABEL}, bots are off the table. Your lineup is posted at ${params.ratingPointsLabel} until another GM drafts against it — often minutes when the pool is thin, sometimes longer.`,
  tip: "Practice and Private matches still work while this lineup is queued. Live Casual/Pro stays locked until it gets a score.",
});

export const getHighBannerQueueLockNote = (modesLabel: string) =>
  `Queued lineup waiting for a live opponent at ${LIVE_OPPONENT_ONLY_MIN_ELO}+ ${RATING_LABEL}${modesLabel}. Live Play stays locked until that match finishes — Practice and Private still work. Soft ETA: often a few minutes when the live pool is thin.`;
