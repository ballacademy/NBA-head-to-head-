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
  return typeof value === "number" ? value : null;
};
