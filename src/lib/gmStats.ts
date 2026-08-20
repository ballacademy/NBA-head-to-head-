import { summarizePlayerDailyDraftHistory } from "./dailyDraftScores";
import {
  formatDailyDraftPlayStreak,
  getDailyDraftPlayStreak,
  getLongestDailyDraftPlayStreak,
} from "./dailyDraftPlayStreak";
import { getDailyDateKey } from "./dailyDraft";
import { getClassicProfileView } from "./classicProfile";
import { getCollectionProgress } from "./playerCollection";
import {
  formatPlayerRecord,
  loadAllModeRecords,
  type ModePlayerRecords,
} from "./playerRecord";
import { getRankedProfileView } from "./rankedProfile";
import { formatRatingPoints, getTierForElo } from "./rankedElo";
import { getCurrentSeasonId, formatSeasonLabel } from "./rankedSeason";
import { loadAllEventProfiles } from "./eventProfile";
import {
  formatLegacyMonthlyFinish,
  formatLegacyPeakBanners,
  formatLegacyPeakBannerCount,
  formatLegacyPeakBannerTier,
  getUnlockedFrontOfficeBadges,
} from "./frontOfficeBadges";
import {
  loadGmLegacyStats,
  mergeGmLegacyStats,
  saveGmLegacyStats,
  type GmLegacyStats,
} from "./gmLegacyStats";
import { fetchRemotePlayerProfile } from "./playerProfileApi";

export interface GmDailyDraftStats {
  daysPlayed: number;
  bestPercentile: number | null;
  averagePercentile: number | null;
  latestResult: string | null;
  basicStreak: number;
  advancedStreak: number;
  longestBasicStreak: number;
  longestAdvancedStreak: number;
  basicStreakLabel: string;
  advancedStreakLabel: string;
}

export interface GmEventRecordStats {
  wins: number;
  losses: number;
  ties: number;
}

export interface GmStatsSnapshot {
  teamName: string;
  records: ModePlayerRecords;
  events: GmEventRecordStats;
  totalWins: number;
  totalLosses: number;
  totalTies: number;
  classic: ReturnType<typeof getClassicProfileView>;
  ranked: ReturnType<typeof getRankedProfileView>;
  legacy: GmLegacyStats;
  dailyDraft: GmDailyDraftStats;
  collection: ReturnType<typeof getCollectionProgress>;
  frontOfficeBadgesUnlocked: ReturnType<typeof getUnlockedFrontOfficeBadges>;
  currentSeasonLabel: string;
}

const summarizeDailyDraftStats = (): GmDailyDraftStats => {
  const summary = summarizePlayerDailyDraftHistory();
  const asOf = getDailyDateKey();
  const basic = getDailyDraftPlayStreak("basic", asOf);
  const advanced = getDailyDraftPlayStreak("advanced", asOf);
  const longestBasicStreak = getLongestDailyDraftPlayStreak("basic");
  const longestAdvancedStreak = getLongestDailyDraftPlayStreak("advanced");

  return {
    ...summary,
    basicStreak: basic.current,
    advancedStreak: advanced.current,
    longestBasicStreak,
    longestAdvancedStreak,
    basicStreakLabel: formatDailyDraftPlayStreak(basic),
    advancedStreakLabel: formatDailyDraftPlayStreak(advanced),
  };
};

export const buildLocalGmStatsSnapshot = (
  teamName: string,
  collection = getCollectionProgress(),
): GmStatsSnapshot => {
  const records = loadAllModeRecords();
  const classic = getClassicProfileView();
  const ranked = getRankedProfileView();
  const legacy = loadGmLegacyStats();
  const events = loadAllEventProfiles().reduce(
    (totals, profile) => ({
      wins: totals.wins + profile.wins,
      losses: totals.losses + profile.losses,
      ties: totals.ties + profile.ties,
    }),
    { wins: 0, losses: 0, ties: 0 },
  );
  const totalWins =
    records.headToHead.wins +
    records.ranked.wins +
    records.allTime.wins +
    events.wins;
  const totalLosses =
    records.headToHead.losses +
    records.ranked.losses +
    records.allTime.losses +
    events.losses;
  const totalTies =
    records.headToHead.ties +
    records.ranked.ties +
    records.allTime.ties +
    events.ties;
  const peakElo = Math.max(legacy.peakElo, classic.peakElo, ranked.peakElo);

  return {
    teamName,
    records,
    events,
    totalWins,
    totalLosses,
    totalTies,
    classic,
    ranked,
    legacy: mergeGmLegacyStats(legacy, {
      ...legacy,
      peakElo,
      peakEloSeasonId:
        ranked.peakElo >= legacy.peakElo && ranked.peakElo >= classic.peakElo
          ? ranked.seasonId
          : classic.peakElo >= legacy.peakElo
            ? classic.seasonId
            : legacy.peakEloSeasonId,
    }),
    dailyDraft: summarizeDailyDraftStats(),
    collection,
    frontOfficeBadgesUnlocked: getUnlockedFrontOfficeBadges(peakElo),
    currentSeasonLabel: formatSeasonLabel(getCurrentSeasonId()),
  };
};

export const refreshGmLegacyFromApi = async () => {
  const local = loadGmLegacyStats();
  const remote = await fetchRemotePlayerProfile({
    playerId: local.playerId,
    seasonId: getCurrentSeasonId(),
  });

  if (!remote?.legacy) {
    return local;
  }

  const merged = mergeGmLegacyStats(local, remote.legacy);
  saveGmLegacyStats(merged);
  return merged;
};

export const formatGmRecordLine = (wins: number, losses: number, ties = 0) =>
  ties > 0 ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`;

export const formatGmModeRecord = (
  label: string,
  wins: number,
  losses: number,
  ties = 0,
) => `${label}: ${formatGmRecordLine(wins, losses, ties)}`;

export const formatGmStatsHeadline = (snapshot: GmStatsSnapshot) =>
  `${snapshot.teamName} · Pro ${formatRatingPoints(snapshot.ranked.elo)} · Casual ${formatRatingPoints(snapshot.classic.elo)}`;

export const formatCurrentRankedTier = (elo: number) =>
  getTierForElo(elo).label;

export {
  formatLegacyMonthlyFinish,
  formatLegacyPeakBanners,
  formatLegacyPeakBannerCount,
  formatLegacyPeakBannerTier,
  formatPlayerRecord,
};
