/**
 * Players banned from Pro (ranked) and Events — usually an unfair salary edge.
 * Still freely draftable in Classic H2H, practice, and Daily Draft (no unlock
 * required). In Pro/Events they stay visible at the bottom of the board with a
 * Banned label and cannot be picked.
 *
 * LeBron's basketball-reference id is `jamesle01`; the active pool row may be
 * team-suffixed (e.g. `jamesle01-phi` after the Philly signing).
 */
export const LEBRON_JAMES_BBR_ID = "jamesle01";

export const isBannedFromRankedAndEvents = (playerId: string) =>
  playerId === LEBRON_JAMES_BBR_ID ||
  playerId.startsWith(`${LEBRON_JAMES_BBR_ID}-`);

export const isBannedRankedEventPlayer = (player: {
  id: string;
  bbrPlayerId?: string | null;
}) =>
  player.bbrPlayerId === LEBRON_JAMES_BBR_ID ||
  isBannedFromRankedAndEvents(player.id);

export const matchmakingModeBansRankedEventPlayers = (
  mode: string | null | undefined,
) => mode === "ranked" || mode === "event";

/** Client match flags that should hide banned players from the draft pool. */
export const shouldApplyRankedEventPlayerBans = (options: {
  isDailyDraft?: boolean;
  practiceMode?: boolean;
  eventId?: string | null;
  /** Pro H2H / private Pro (not Classic). */
  salaryCapMode?: boolean;
}) => {
  if (options.isDailyDraft || options.practiceMode) {
    return false;
  }

  return Boolean(options.eventId) || Boolean(options.salaryCapMode);
};

export const filterOutRankedEventBannedPlayers = <
  T extends { id: string; bbrPlayerId?: string | null },
>(
  pool: readonly T[],
): T[] => pool.filter((player) => !isBannedRankedEventPlayer(player));

export const lineupContainsRankedEventBannedPlayer = (
  lineup: readonly string[],
) => lineup.some((playerId) => isBannedFromRankedAndEvents(playerId));

export const rankedEventBannedPlayerError = () =>
  "lineup contains a player who is not eligible for Pro or Events";
