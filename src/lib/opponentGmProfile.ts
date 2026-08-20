/** Whether match-results can open the same GM profile as the leaderboard. */
export const canOpenOpponentGmProfile = (options: {
  profilePlayerId?: string | null;
  practiceMode?: boolean;
  eventId?: string | null;
  allTimeMode?: boolean;
}): boolean => {
  const profilePlayerId = options.profilePlayerId?.trim() ?? "";

  if (!profilePlayerId) {
    return false;
  }

  // Practice bots and synthetic ids have no public GM profile.
  if (
    options.practiceMode ||
    profilePlayerId.startsWith("npc-") ||
    profilePlayerId.startsWith("ghost-") ||
    profilePlayerId.startsWith("live-")
  ) {
    return false;
  }

  // Weekly events track a separate ladder; skip Casual/Pro profile there.
  // All-Time uses a separate ladder — Casual/Pro monthly stats would mislead.
  if (options.eventId || options.allTimeMode) {
    return false;
  }

  return true;
};
