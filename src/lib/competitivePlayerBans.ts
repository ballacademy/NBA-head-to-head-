/**
 * Players banned from competitive Casual H2H, Pro H2H, and Events —
 * usually an unfair salary / impact edge. Still freely draftable in practice
 * and Daily Draft (no unlock required). In banned modes they stay visible at
 * the bottom of the board with a Banned label and cannot be picked.
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

/** Live Casual, Pro, and Events reject banned players on the server. */
export const matchmakingModeBansRankedEventPlayers = (
  mode: string | null | undefined,
) => mode === "classic" || mode === "ranked" || mode === "event";

/**
 * Client match flags that ban players from the pickable draft pool.
 * Daily Draft and practice stay open; live Casual / Pro / Events ban.
 */
export const shouldApplyRankedEventPlayerBans = (options: {
  isDailyDraft?: boolean;
  practiceMode?: boolean;
  eventId?: string | null;
  /** Pro H2H / private Pro. */
  salaryCapMode?: boolean;
  /**
   * Live Casual H2H (not practice). When omitted, classic live is inferred
   * for competitive drafts that are not Daily / practice / Pro / Events.
   */
  classicLive?: boolean;
}) => {
  if (options.isDailyDraft || options.practiceMode) {
    return false;
  }

  if (Boolean(options.eventId) || Boolean(options.salaryCapMode)) {
    return true;
  }

  if (options.classicLive === true) {
    return true;
  }

  // Infer classic live when callers pass the usual match flags without
  // marking Daily / practice / Pro / Events (App draft + startMatch paths).
  if (
    options.classicLive === undefined &&
    options.isDailyDraft === false &&
    options.practiceMode === false &&
    !options.eventId &&
    options.salaryCapMode === false
  ) {
    return true;
  }

  return false;
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
  "lineup contains a player who is not eligible for Casual H2H, Pro, or Events";
