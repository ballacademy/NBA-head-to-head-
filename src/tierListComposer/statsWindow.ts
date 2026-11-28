import type { ComposerStatsSample } from "../instagramComposer/composerStatsSample";
import {
  everyTeamCurrentSeason,
  everyTeamSeasons,
  isEveryTeamRostersReady,
  playerRowForSeason,
  playerStatValue,
  teamStatValue,
  type EveryTeamStatMetric,
} from "../everyTeamComposer/historicalRosters";
import type { PlayerSearchFilters, TierPlayer } from "./nbaActivePlayers";

export const STATS_WINDOW_CURRENT = "current";
export const STATS_WINDOW_RANGE = "range";
export const STATS_DECADE_WINDOWS = ["2020s", "2010s", "2000s"] as const;

export type StatsDecadeWindow = (typeof STATS_DECADE_WINDOWS)[number];

const SEASON_ID = /^\d{4}-\d{2}$/;

export const isStatsDecadeWindow = (
  value: string,
): value is StatsDecadeWindow =>
  (STATS_DECADE_WINDOWS as readonly string[]).includes(value);

export const parseStatsWindow = (value: unknown): string => {
  if (typeof value !== "string" || !value) {
    return STATS_WINDOW_CURRENT;
  }
  if (
    value === STATS_WINDOW_CURRENT ||
    value === STATS_WINDOW_RANGE ||
    isStatsDecadeWindow(value) ||
    SEASON_ID.test(value)
  ) {
    return value;
  }
  return STATS_WINDOW_CURRENT;
};

const seasonStartYear = (season: string) => Number(season.split("-")[0]);

const availableSeasons = (
  available = everyTeamSeasons(),
  current = everyTeamCurrentSeason(),
) => (available.length ? available : [current]);

export const seasonsForStatsWindow = (
  filters: Pick<PlayerSearchFilters, "statsWindow" | "statsFrom" | "statsTo">,
  available = everyTeamSeasons(),
  current = everyTeamCurrentSeason(),
): string[] => {
  const window = parseStatsWindow(filters.statsWindow);
  const known = availableSeasons(available, current);
  if (window === STATS_WINDOW_CURRENT) {
    return [current];
  }
  if (isStatsDecadeWindow(window)) {
    const decade = Number(window.slice(0, 4));
    return known.filter((season) => {
      const year = seasonStartYear(season);
      return year >= decade && year < decade + 10;
    });
  }
  if (window === STATS_WINDOW_RANGE) {
    const from =
      filters.statsFrom && known.includes(filters.statsFrom)
        ? filters.statsFrom
        : known[0];
    const to =
      filters.statsTo && known.includes(filters.statsTo)
        ? filters.statsTo
        : current;
    const lo = known.indexOf(from);
    const hi = known.indexOf(to);
    if (lo < 0 || hi < 0) {
      return [current];
    }
    const start = Math.min(lo, hi);
    const end = Math.max(lo, hi);
    return known.slice(start, end + 1);
  }
  if (known.includes(window)) {
    return [window];
  }
  return [current];
};

export const statsWindowLabel = (
  filters: Pick<PlayerSearchFilters, "statsWindow" | "statsFrom" | "statsTo">,
  available = everyTeamSeasons(),
  current = everyTeamCurrentSeason(),
) => {
  const window = parseStatsWindow(filters.statsWindow);
  if (window === STATS_WINDOW_CURRENT) {
    return `${current} (current)`;
  }
  if (isStatsDecadeWindow(window)) {
    return window;
  }
  if (window === STATS_WINDOW_RANGE) {
    const seasons = seasonsForStatsWindow(filters, available, current);
    if (!seasons.length) {
      return "Season range";
    }
    if (seasons.length === 1) {
      return seasons[0];
    }
    return `${seasons[0]}–${seasons[seasons.length - 1]}`;
  }
  return window;
};

export const statsWindowOptions = (
  available = everyTeamSeasons(),
  current = everyTeamCurrentSeason(),
): ReadonlyArray<{ id: string; label: string; group?: string }> => {
  const known = availableSeasons(available, current);
  return [
    { id: STATS_WINDOW_CURRENT, label: `${current} (current)` },
    ...STATS_DECADE_WINDOWS.map((id) => ({
      id,
      label: id,
      group: "Decades",
    })),
    { id: STATS_WINDOW_RANGE, label: "Season range" },
    ...[...known].reverse().map((season) => ({
      id: season,
      label: season,
      group: "Seasons",
    })),
  ];
};

const statForSeason = (
  playerId: string,
  teamId: string | null | undefined,
  metric: EveryTeamStatMetric,
  season: string,
  sample: ComposerStatsSample,
) =>
  playerStatValue(playerId, season, metric, teamId, sample) ??
  (sample === "regular"
    ? null
    : playerStatValue(playerId, season, metric, teamId, "regular"));

export const averagePlayerStat = (
  playerId: string,
  teamId: string | null | undefined,
  metric: EveryTeamStatMetric,
  seasons: string[],
  sample: ComposerStatsSample = "regular",
): number | null => {
  if (!seasons.length) {
    return null;
  }
  if (seasons.length === 1) {
    return statForSeason(playerId, teamId, metric, seasons[0], sample);
  }
  let weight = 0;
  let sum = 0;
  seasons.forEach((season) => {
    const value = statForSeason(playerId, teamId, metric, season, sample);
    if (value == null) {
      return;
    }
    const row = playerRowForSeason(playerId, season, teamId, sample);
    const gp = row?.gp && row.gp > 0 ? row.gp : 1;
    sum += value * gp;
    weight += gp;
  });
  return weight > 0 ? sum / weight : null;
};

export const averageTeamStat = (
  teamId: string,
  metric: EveryTeamStatMetric,
  seasons: string[],
  sample: ComposerStatsSample = "regular",
): number | null => {
  if (!seasons.length) {
    return null;
  }
  if (seasons.length === 1) {
    return (
      teamStatValue(teamId, seasons[0], metric, sample) ??
      (sample === "regular"
        ? null
        : teamStatValue(teamId, seasons[0], metric, "regular"))
    );
  }
  let weight = 0;
  let sum = 0;
  seasons.forEach((season) => {
    const value =
      teamStatValue(teamId, season, metric, sample) ??
      (sample === "regular"
        ? null
        : teamStatValue(teamId, season, metric, "regular"));
    if (value == null) {
      return;
    }
    sum += value;
    weight += 1;
  });
  return weight > 0 ? sum / weight : null;
};

export const overlayCountingStats = (
  players: readonly TierPlayer[],
  filters: Pick<PlayerSearchFilters, "statsWindow" | "statsFrom" | "statsTo">,
  sample: ComposerStatsSample = "regular",
): TierPlayer[] => {
  if (!isEveryTeamRostersReady() && everyTeamSeasons().length === 0) {
    return players.map((player) => ({ ...player, mpg: player.mpg ?? 0 }));
  }
  const seasons = seasonsForStatsWindow(filters);
  return players.map((player) => {
    if (player.role === "coach") {
      return { ...player, mpg: 0 };
    }
    const pts = averagePlayerStat(
      player.id,
      player.team,
      "points",
      seasons,
      sample,
    );
    const min = averagePlayerStat(
      player.id,
      player.team,
      "minutes",
      seasons,
      sample,
    );
    return {
      ...player,
      ppg: pts ?? 0,
      mpg: min ?? 0,
    };
  });
};
