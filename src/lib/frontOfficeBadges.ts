import { getCurrentSeasonId, formatSeasonLabel } from "./rankedSeason";
import {
  formatRankedElo,
  formatRatingPoints,
  getTierForElo,
  RANKED_TIERS,
  type RankedTier,
} from "./rankedElo";

export interface FrontOfficeBadge {
  id: string;
  label: string;
  minElo: number;
  emoji: string;
  description: string;
}

export const FRONT_OFFICE_BADGES: readonly FrontOfficeBadge[] = [
  {
    id: "two-way",
    label: "Tank Commander",
    minElo: 0,
    emoji: "🛠️",
    description: "Reach the Tank Commander front office tier.",
  },
  {
    id: "gleague",
    label: "G-League GM",
    minElo: 500,
    emoji: "🏟️",
    description: "Reach the G-League GM front office tier.",
  },
  {
    id: "nba-gm",
    label: "NBA GM",
    minElo: 1000,
    emoji: "🏀",
    description: "Reach the NBA GM front office tier.",
  },
  {
    id: "top-gm",
    label: "Top GM",
    minElo: 1500,
    emoji: "⭐",
    description: "Reach the Top GM front office tier.",
  },
  {
    id: "generational",
    label: "Generational GM",
    minElo: 2000,
    emoji: "👑",
    description: "Reach the Generational GM front office tier.",
  },
] as const;

export const getFrontOfficeBadgeForTier = (tier: RankedTier) =>
  FRONT_OFFICE_BADGES.find((badge) => badge.id === tier.id) ?? FRONT_OFFICE_BADGES[0]!;

export const getUnlockedFrontOfficeBadges = (peakElo: number) =>
  FRONT_OFFICE_BADGES.filter((badge) => peakElo >= badge.minElo);

export const formatLegacyMonthlyFinish = (
  rank: number | null | undefined,
  seasonId: string | null | undefined,
) => {
  if (!rank || rank <= 0) {
    return "No ranked finish yet";
  }

  const seasonLabel = seasonId ? formatSeasonLabel(seasonId) : "month";
  return `#${rank} in ${seasonLabel}`;
};

export const formatLegacyPeakBannerCount = (
  peakElo: number | null | undefined,
) => {
  if (!peakElo || peakElo <= 0) {
    return "No banners yet";
  }

  return formatRatingPoints(peakElo);
};

export const formatLegacyPeakBannerTier = (
  peakElo: number | null | undefined,
) => {
  if (!peakElo || peakElo <= 0) {
    return null;
  }

  return getTierForElo(peakElo).label;
};

export const formatLegacyPeakBanners = (peakElo: number | null | undefined) => {
  const count = formatLegacyPeakBannerCount(peakElo);
  const tier = formatLegacyPeakBannerTier(peakElo);

  if (!tier) {
    return count;
  }

  return `${count} · ${tier}`;
};

export const summarizePeakEloSeason = (seasonId: string | null | undefined) =>
  seasonId ? formatSeasonLabel(seasonId) : getCurrentSeasonId();

export const getNextFrontOfficeBadge = (peakElo: number) => {
  const next = RANKED_TIERS.find((tier) => peakElo < tier.minElo);
  return next ? getFrontOfficeBadgeForTier(next) : null;
};

export const formatRankedEloLabel = formatRankedElo;
