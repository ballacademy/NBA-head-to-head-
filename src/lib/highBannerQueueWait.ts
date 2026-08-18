import {
  LIVE_OPPONENT_ONLY_MIN_ELO,
  RATING_LABEL,
  requiresLiveOpponentOnly,
} from "./rankedElo";

export { requiresLiveOpponentOnly };

/** Soft ETA copy for 1500+ live-only searches and post-draft queue waits. */
export const getHighBannerSearchWaitMessage = (elapsedSeconds: number) => {
  if (elapsedSeconds < 8) {
    return `At ${LIVE_OPPONENT_ONLY_MIN_ELO}+ ${RATING_LABEL}, searching for a live or saved opponent near your rating…`;
  }

  if (elapsedSeconds < 20) {
    return "Pool can be thin here. Hang tight, or cancel and use Practice / Private.";
  }

  return "Still searching. If nobody joins, you'll draft once — your lineup waits until another GM plays it.";
};

export const getHighBannerQueuedWaitCopy = (params: {
  ratingPointsLabel: string;
}) => ({
  headline: "Waiting for a live opponent",
  body: `Your five is posted at ${params.ratingPointsLabel}. Another GM has to draft against it — often a few minutes, sometimes longer.`,
  tip: "Practice and Private still work. Live Casual/Pro unlocks when this match gets a score.",
});

export const getHighBannerQueueLockNote = (modesLabel: string) =>
  `Lineup queued at ${LIVE_OPPONENT_ONLY_MIN_ELO}+ ${RATING_LABEL}${modesLabel}. You'll get a result when someone plays it — often a few minutes. Practice and Private still work.`;
