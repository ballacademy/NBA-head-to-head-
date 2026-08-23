import { peekCachedAccountLinked, isPlayerAccountLinked } from "./accountGate";
import { readJson, writeJson } from "./browserStorage";
import { getOrCreatePlayerId } from "./playerRecord";
import {
  RANKED_STARTING_ELO,
  calculateEloChange,
  clampGuestRankedElo,
  getTierForElo,
  type RankedTier,
} from "./rankedElo";
import { getCurrentSeasonId } from "./rankedSeason";
import { recordLocalGmLegacySnapshot } from "./gmLegacyStats";
import type { HeadToHeadResult } from "./playerRecord";

/** True only when cache says linked — unknown (`null`) is not treated as linked. */
const isRankedAccountLinkedSync = (playerId: string) =>
  peekCachedAccountLinked(playerId) === true;

/**
 * Persist guest Elo clamps only when link status is known-false.
 * Unknown (`null`) must not rewrite storage — that permanently capped linked GMs
 * whose account cache had expired.
 */
const shouldPersistGuestEloClamp = (playerId: string) =>
  peekCachedAccountLinked(playerId) === false;

const getActiveStreakForElo = (
  result: HeadToHeadResult,
  winStreak: number,
  lossStreak: number,
) => {
  if (result === "win") {
    return winStreak;
  }

  if (result === "loss") {
    return lossStreak;
  }

  return 0;
};

const RANKED_PROFILE_KEY = "nba-head-to-head-ranked-profile";

export interface RankedProfile {
  playerId: string;
  seasonId: string;
  elo: number;
  peakElo: number;
  rankedGamesPlayed: number;
}

const createDefaultProfile = (
  playerId: string,
  seasonId: string,
): RankedProfile => ({
  playerId,
  seasonId,
  elo: RANKED_STARTING_ELO,
  peakElo: RANKED_STARTING_ELO,
  rankedGamesPlayed: 0,
});

const normalizeProfile = (
  saved: Partial<RankedProfile> | null,
  playerId: string,
  seasonId: string,
): RankedProfile => {
  if (
    !saved ||
    saved.playerId !== playerId ||
    saved.seasonId !== seasonId ||
    typeof saved.elo !== "number"
  ) {
    return createDefaultProfile(playerId, seasonId);
  }

  const elo = Math.max(0, Math.round(saved.elo));
  const peakElo = Math.max(
    elo,
    Math.round(saved.peakElo ?? elo),
  );

  return {
    playerId,
    seasonId,
    elo,
    peakElo,
    rankedGamesPlayed: Math.max(0, saved.rankedGamesPlayed ?? 0),
  };
};

export const loadRankedProfile = (): RankedProfile => {
  const playerId = getOrCreatePlayerId();
  const seasonId = getCurrentSeasonId();
  const saved = readJson<RankedProfile>(RANKED_PROFILE_KEY);

  return normalizeProfile(saved, playerId, seasonId);
};

export const saveRankedProfile = (profile: RankedProfile) => {
  writeJson(RANKED_PROFILE_KEY, profile);
};

export const ensureCurrentRankedSeason = (): RankedProfile => {
  const profile = loadRankedProfile();
  const seasonId = getCurrentSeasonId();

  if (profile.seasonId !== seasonId) {
    const next = createDefaultProfile(profile.playerId, seasonId);
    saveRankedProfile(next);
    return next;
  }

  // Guests who already climbed past the cap (older builds) get pulled back.
  // Skip when link status is unknown so we never permanently clamp a linked GM.
  if (shouldPersistGuestEloClamp(profile.playerId)) {
    const cappedElo = clampGuestRankedElo(profile.elo, false);
    const cappedPeak = clampGuestRankedElo(profile.peakElo, false);
    if (cappedElo !== profile.elo || cappedPeak !== profile.peakElo) {
      const next = { ...profile, elo: cappedElo, peakElo: cappedPeak };
      saveRankedProfile(next);
      return next;
    }
  }

  return profile;
};

/** Elo used for Pro queue / rematch — guests never match above the guest cap. */
export const resolveRankedEloForMatchmaking = async (): Promise<number> => {
  const profile = ensureCurrentRankedSeason();
  const linked = await isPlayerAccountLinked(profile.playerId);
  return clampGuestRankedElo(profile.elo, linked);
};

/** Sync read for UI (live-only badge). Fail closed when link status is unknown. */
export const resolveRankedEloForMatchmakingSync = (): number => {
  const profile = ensureCurrentRankedSeason();
  return clampGuestRankedElo(
    profile.elo,
    isRankedAccountLinkedSync(profile.playerId),
  );
};

export interface RankedProfileView extends RankedProfile {
  tier: RankedTier;
}

export const getRankedProfileView = (): RankedProfileView => {
  const profile = ensureCurrentRankedSeason();

  return {
    ...profile,
    tier: getTierForElo(profile.elo),
  };
};

export interface ApplyRankedMatchInput {
  result: HeadToHeadResult;
  opponentElo: number;
  winStreak: number;
  lossStreak: number;
}

export interface ApplyRankedMatchResult {
  profile: RankedProfileView;
  delta: number;
  opponentElo: number;
}

export const applyRankedMatchResult = ({
  result,
  opponentElo,
  winStreak,
  lossStreak,
}: ApplyRankedMatchInput): ApplyRankedMatchResult => {
  const current = ensureCurrentRankedSeason();
  const activeStreak = getActiveStreakForElo(result, winStreak, lossStreak);
  const { nextElo } = calculateEloChange({
    playerElo: current.elo,
    opponentElo,
    result,
    rankedGamesPlayed: current.rankedGamesPlayed,
    activeStreak,
  });

  // Persist the guest cap only for known guests. Unknown link status must not
  // write a clamped Elo (that permanently stuck linked accounts at 1500).
  const accountLinkedForPersist = !shouldPersistGuestEloClamp(current.playerId);
  const cappedElo = clampGuestRankedElo(nextElo, accountLinkedForPersist);
  const appliedDelta = cappedElo - current.elo;

  const nextProfile: RankedProfile = {
    ...current,
    elo: cappedElo,
    peakElo: Math.max(
      clampGuestRankedElo(current.peakElo, accountLinkedForPersist),
      cappedElo,
    ),
    rankedGamesPlayed: current.rankedGamesPlayed + 1,
  };

  saveRankedProfile(nextProfile);

  // Warm account cache so the next match uses a firm linked/guest answer.
  // If this resolves to guest and we wrote an uncapped Elo, pull it back.
  void isPlayerAccountLinked(current.playerId).then((linked) => {
    if (linked) {
      return;
    }
    const latest = loadRankedProfile();
    if (
      latest.playerId !== current.playerId ||
      latest.seasonId !== nextProfile.seasonId
    ) {
      return;
    }
    const guestElo = clampGuestRankedElo(latest.elo, false);
    const guestPeak = clampGuestRankedElo(latest.peakElo, false);
    if (guestElo !== latest.elo || guestPeak !== latest.peakElo) {
      saveRankedProfile({ ...latest, elo: guestElo, peakElo: guestPeak });
    }
  });

  recordLocalGmLegacySnapshot({
    elo: nextProfile.peakElo,
    seasonId: nextProfile.seasonId,
  });

  return {
    profile: {
      ...nextProfile,
      tier: getTierForElo(nextProfile.elo),
    },
    delta: appliedDelta,
    opponentElo,
  };
};
