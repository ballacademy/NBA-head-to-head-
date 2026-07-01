import { summarizePlayerDailyDraftHistory } from "./dailyDraftScores";
import { getCollectionProgress } from "./playerCollection";
import {
  formatPlayerRecord,
  loadAllModeRecords,
  type ModePlayerRecords,
} from "./playerRecord";
import { getRankedProfileView } from "./rankedProfile";
import { formatRatingPoints, getTierForElo } from "./rankedElo";
import { getCurrentSeasonId, formatSeasonLabel } from "./rankedSeason";
import {
  formatLegacyMonthlyFinish,
  formatLegacyPeakBanners,
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
}

export interface GmStatsSnapshot {
  teamName: string;
  records: ModePlayerRecords;
  totalWins: number;
  totalLosses: number;
  ranked: ReturnType<typeof getRankedProfileView>;
  legacy: GmLegacyStats;
  dailyDraft: GmDailyDraftStats;
  collection: ReturnType<typeof getCollectionProgress>;
  frontOfficeBadgesUnlocked: ReturnType<typeof getUnlockedFrontOfficeBadges>;
  currentSeasonLabel: string;
}

const summarizeDailyDraftStats = () => summarizePlayerDailyDraftHistory();

export const buildLocalGmStatsSnapshot = (
  teamName: string,
  collection = getCollectionProgress(),
): GmStatsSnapshot => {
  const records = loadAllModeRecords();
  const ranked = getRankedProfileView();
  const legacy = loadGmLegacyStats();
  const totalWins =
    records.headToHead.wins + records.ranked.wins + records.allTime.wins;
  const totalLosses =
    records.headToHead.losses + records.ranked.losses + records.allTime.losses;

  return {
    teamName,
    records,
    totalWins,
    totalLosses,
    ranked,
    legacy: mergeGmLegacyStats(legacy, {
      ...legacy,
      peakElo: Math.max(legacy.peakElo, ranked.peakElo),
      peakEloSeasonId:
        ranked.peakElo >= legacy.peakElo
          ? ranked.seasonId
          : legacy.peakEloSeasonId,
    }),
    dailyDraft: summarizeDailyDraftStats(),
    collection,
    frontOfficeBadgesUnlocked: getUnlockedFrontOfficeBadges(
      Math.max(legacy.peakElo, ranked.peakElo),
    ),
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
  `${snapshot.teamName} · ${formatRatingPoints(snapshot.ranked.elo)}`;

export const formatCurrentRankedTier = (elo: number) =>
  getTierForElo(elo).label;

export {
  formatLegacyMonthlyFinish,
  formatLegacyPeakBanners,
  formatPlayerRecord,
};
