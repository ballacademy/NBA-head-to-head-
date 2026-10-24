import catalog from "../../data/nba-team-season-stats.json";
import type { ComposerStatsSample } from "../instagramComposer/composerStatsSample";
import {
  statsSeasonFor,
  type EveryTeamStatMetric,
} from "./historicalRosters";

type TeamSeasonRow = Partial<Record<EveryTeamStatMetric, number>>;

const TEAM_SEASON_STATS = catalog.seasons as Record<
  string,
  Record<string, TeamSeasonRow>
>;

export const officialTeamSeason = (
  season: string,
  sample: ComposerStatsSample = "regular",
) => {
  const statsSeason = statsSeasonFor(season, sample);
  if (TEAM_SEASON_STATS[statsSeason]) {
    return statsSeason;
  }
  if (sample !== "regular") {
    const regular = statsSeasonFor(season, "regular");
    if (TEAM_SEASON_STATS[regular]) {
      return regular;
    }
  }
  if (TEAM_SEASON_STATS[season]) {
    return season;
  }
  return statsSeason;
};

export const officialTeamStatValue = (
  teamId: string,
  season: string,
  metric: EveryTeamStatMetric,
  sample: ComposerStatsSample = "regular",
): number | null => {
  const row = TEAM_SEASON_STATS[officialTeamSeason(season, sample)]?.[teamId];
  const value = row?.[metric];
  if (typeof value === "number") {
    return value;
  }
  if (sample !== "regular") {
    const fallback =
      TEAM_SEASON_STATS[officialTeamSeason(season, "regular")]?.[teamId]?.[
        metric
      ];
    if (typeof fallback === "number") {
      return fallback;
    }
  }
  return null;
};
