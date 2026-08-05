/** Whether match-results can open the same GM profile as the leaderboard. */
export const canOpenOpponentGmProfile = (options: {
  profilePlayerId?: string | null;
  practiceMode?: boolean;
  eventId?: string | null;
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

  // Weekly events track a separate ladder; skip Classic/Pro profile there.
  // Private H2H is allowed — room opponents are real accounts.
  if (options.eventId) {
    return false;
  }

  return true;
};
