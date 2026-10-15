import playerAveragesFile from "../../data/nba-player-stat-averages.json";
import type { ComposerStatsSample } from "../instagramComposer/composerStatsSample";
import {
  getConferenceForTeam,
  getDivisionForTeam,
} from "../lib/divisions";
import { NBA_TEAMS, NBA_TEAMS_BY_ID } from "../standingsComposer/teams";
import type { TierPlayer } from "../tierListComposer/nbaActivePlayers";

export interface EveryTeamRosterPlayer {
  id: string;
  name: string;
  position: string;
  depth: number;
  headshotUrl: string;
  pts: number | null;
  reb: number | null;
  ast: number | null;
  stl: number | null;
  blk: number | null;
  gp?: number | null;
  min?: number | null;
  tov?: number | null;
  fgPct?: number | null;
  fg3Pct?: number | null;
  ftPct?: number | null;
  efgPct?: number | null;
  tsPct?: number | null;
}

type SeasonAverageExtras = Pick<
  EveryTeamRosterPlayer,
  "gp" | "min" | "tov" | "fgPct" | "fg3Pct" | "ftPct" | "efgPct" | "tsPct"
>;

const seasonAverages = playerAveragesFile as {
  season: string;
  byEspnId: Record<string, SeasonAverageExtras>;
};

const EXTRA_KEYS: Array<keyof SeasonAverageExtras> = [
  "gp",
  "min",
  "tov",
  "fgPct",
  "fg3Pct",
  "ftPct",
  "efgPct",
  "tsPct",
];

export interface EveryTeamSeasonCell {
  missing?: boolean;
  reason?: string;
  historyId?: string;
  historyName?: string;
  source?: string;
  players?: EveryTeamRosterPlayer[];
}

interface HistoricalCatalog {
  currentSeason: string;
  seasons: string[];
  rosters: Record<string, Record<string, EveryTeamSeasonCell>>;
}

let currentSeason = "2026-27";
let seasons: string[] = [];
let rosters: Record<string, Record<string, EveryTeamSeasonCell>> = {};
let loaded = false;
let loading: Promise<void> | null = null;
let priorStatsCache: {
  season: string;
  byId: Map<string, EveryTeamRosterPlayer>;
} | null = null;
let depthIndexCache: {
  season: string;
  byId: Map<string, Array<{ teamId: string; depth: number }>>;
} | null = null;

export const EVERY_TEAM_SORT_KEY = "ddgm:every-team-player-sort";

export const isEveryTeamRostersReady = () => loaded;

export const everyTeamSeasons = () => seasons;

export const everyTeamCurrentSeason = () => currentSeason;

export const hydrateEveryTeamRosters = (payload: HistoricalCatalog) => {
  currentSeason = payload.currentSeason;
  seasons = payload.seasons.slice();
  rosters = payload.rosters;
  loaded = true;
  priorStatsCache = null;
  depthIndexCache = null;
};

export const loadEveryTeamRosters = async () => {
  if (loaded) {
    return;
  }
  if (!loading) {
    loading = fetch("/every-team-historical-rosters.json")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Rosters ${response.status}`);
        }
        return response.json() as Promise<HistoricalCatalog>;
      })
      .then(hydrateEveryTeamRosters)
      .finally(() => {
        loading = null;
      });
  }
  await loading;
};

export const parseEveryTeamSeason = (value: unknown): string =>
  typeof value === "string" && seasons.includes(value) ? value : currentSeason;

export const parseCellSeasons = (value: unknown): Record<string, string> => {
  if (!value || typeof value !== "object") {
    return {};
  }
  const raw = value as Record<string, unknown>;
  const next: Record<string, string> = {};
  Object.keys(raw).forEach((teamId) => {
    if (!NBA_TEAMS_BY_ID[teamId]) {
      return;
    }
    const season = raw[teamId];
    if (typeof season === "string" && seasons.includes(season)) {
      next[teamId] = season;
    }
  });
  return next;
};

export const seasonForTeam = (
  teamId: string,
  boardSeason: string,
  cellSeasons: Record<string, string> = {},
) => cellSeasons[teamId] ?? boardSeason;

export const setCellSeason = (
  cellSeasons: Record<string, string>,
  teamId: string,
  season: string,
  boardSeason: string,
): Record<string, string> => {
  const next = { ...cellSeasons };
  if (!season || season === boardSeason) {
    delete next[teamId];
  } else {
    next[teamId] = season;
  }
  return next;
};

export const getSeasonCell = (
  teamId: string,
  season: string,
): EveryTeamSeasonCell | null => rosters[teamId]?.[season] ?? null;

export const isMissingSeason = (teamId: string, season: string) =>
  getSeasonCell(teamId, season)?.missing === true;

export const missingSeasonReason = (teamId: string, season: string) =>
  getSeasonCell(teamId, season)?.reason ?? `No ${season} roster for ${teamId}.`;

const rawRosterPlayers = (
  teamId: string,
  season: string,
): EveryTeamRosterPlayer[] => {
  const cell = getSeasonCell(teamId, season);
  if (!cell || cell.missing) {
    return [];
  }
  return cell.players ?? [];
};

export const previousSeason = (season: string) => {
  const [start] = season.split("-");
  const startYear = Number(start);
  if (!startYear) {
    return season;
  }
  const end = String(startYear).slice(-2).padStart(2, "0");
  return `${startYear - 1}-${end}`;
};

const highScorerCount = (season: string) => {
  let count = 0;
  Object.keys(rosters).forEach((teamId) => {
    rawRosterPlayers(teamId, season).forEach((player) => {
      if (player.pts != null && player.pts >= 27) {
        count += 1;
      }
    });
  });
  return count;
};

/**
 * Upcoming/current year often has ESPN preseason scraps, not a BBR table.
 * Regular-season sample borrows last year until this year’s table exists.
 * Preseason sample keeps the current year so those scraps are usable now.
 */
export const statsSeasonFor = (
  season: string,
  sample: ComposerStatsSample = "regular",
) => {
  if (sample === "preseason" || season !== currentSeason) {
    return season;
  }
  const prev = previousSeason(season);
  if (!seasons.includes(prev)) {
    return season;
  }
  if (highScorerCount(season) < 3 && highScorerCount(prev) >= 3) {
    return prev;
  }
  return season;
};

const priorStatsById = (statsSeason: string) => {
  if (priorStatsCache?.season === statsSeason) {
    return priorStatsCache.byId;
  }
  const byId = new Map<string, EveryTeamRosterPlayer>();
  Object.keys(rosters).forEach((teamId) => {
    rawRosterPlayers(teamId, statsSeason).forEach((player) => {
      if (!byId.has(player.id)) {
        byId.set(player.id, player);
      }
    });
  });
  priorStatsCache = { season: statsSeason, byId };
  return byId;
};

/** Last season’s row for this player, even if they switched teams. */
const priorPlayerStats = (
  playerId: string,
  teamId: string,
  statsSeason: string,
): EveryTeamRosterPlayer | null =>
  rawRosterPlayers(teamId, statsSeason).find(
    (candidate) => candidate.id === playerId,
  ) ??
  priorStatsById(statsSeason).get(playerId) ??
  null;

const extrasForSeason = (
  playerId: string,
  statsSeason: string,
): SeasonAverageExtras | null => {
  if (statsSeason !== seasonAverages.season) {
    return null;
  }
  return seasonAverages.byEspnId[playerId] ?? null;
};

const mergeSeasonAverages = (
  player: EveryTeamRosterPlayer,
  statsSeason: string,
): EveryTeamRosterPlayer => {
  const extras = extrasForSeason(player.id, statsSeason);
  if (!extras) {
    return player;
  }
  const next: EveryTeamRosterPlayer = { ...player };
  EXTRA_KEYS.forEach((key) => {
    const value = extras[key];
    if (typeof value === "number") {
      next[key] = value;
    }
  });
  return next;
};

/** Season averages for a player, using last year’s table when this year is empty. */
export const playerRowForSeason = (
  playerId: string,
  season: string,
  teamId?: string | null,
  sample: ComposerStatsSample = "regular",
): EveryTeamRosterPlayer | null => {
  if (!playerId) {
    return null;
  }
  const statsSeason = statsSeasonFor(season, sample);
  const row = teamId
    ? priorPlayerStats(playerId, teamId, statsSeason)
    : (priorStatsById(statsSeason).get(playerId) ?? null);
  const found = row ?? priorStatsById(statsSeason).get(playerId) ?? null;
  return found ? mergeSeasonAverages(found, statsSeason) : null;
};

const overlayLastSeasonStats = (
  player: EveryTeamRosterPlayer,
  teamId: string,
  season: string,
  sample: ComposerStatsSample = "regular",
): EveryTeamRosterPlayer => {
  const statsSeason = statsSeasonFor(season, sample);
  if (statsSeason === season) {
    return mergeSeasonAverages(player, statsSeason);
  }
  const prior = priorPlayerStats(player.id, teamId, statsSeason);
  if (!prior) {
    return mergeSeasonAverages(
      {
        ...player,
        pts: null,
        reb: null,
        ast: null,
        stl: null,
        blk: null,
      },
      statsSeason,
    );
  }
  return mergeSeasonAverages(
    {
      ...player,
      pts: prior.pts,
      reb: prior.reb,
      ast: prior.ast,
      stl: prior.stl,
      blk: prior.blk,
      gp: prior.gp ?? player.gp ?? null,
      min: prior.min ?? player.min ?? null,
      tov: prior.tov ?? player.tov ?? null,
      fgPct: prior.fgPct ?? player.fgPct ?? null,
      fg3Pct: prior.fg3Pct ?? player.fg3Pct ?? null,
      ftPct: prior.ftPct ?? player.ftPct ?? null,
      efgPct: prior.efgPct ?? player.efgPct ?? null,
      tsPct: prior.tsPct ?? player.tsPct ?? null,
    },
    statsSeason,
  );
};

export const listRosterPlayers = (
  teamId: string,
  season: string,
  sample: ComposerStatsSample = "regular",
): EveryTeamRosterPlayer[] =>
  rawRosterPlayers(teamId, season).map((player) =>
    overlayLastSeasonStats(player, teamId, season, sample),
  );

export const teamLogoSrc = (
  teamId: string,
  season: string,
  historical = false,
) => {
  const modern = NBA_TEAMS_BY_ID[teamId]?.logoSrc ?? `/nba-logos/${teamId}.png`;
  if (!historical) {
    return modern;
  }
  const historyId = getSeasonCell(teamId, season)?.historyId;
  if (historyId && historyId !== teamId) {
    return `/nba-logos/${historyId}.png`;
  }
  return modern;
};

export const getRosterPlayer = (
  teamId: string,
  season: string,
  playerId: string | null | undefined,
  sample: ComposerStatsSample = "regular",
): EveryTeamRosterPlayer | null => {
  if (!playerId) {
    return null;
  }
  return (
    listRosterPlayers(teamId, season, sample).find(
      (player) => player.id === playerId,
    ) ?? null
  );
};

export const rosterHasPlayer = (
  teamId: string,
  season: string,
  playerId: string,
) => Boolean(getRosterPlayer(teamId, season, playerId));

export const historyLabel = (teamId: string, season: string) => {
  const cell = getSeasonCell(teamId, season);
  return cell?.historyName || NBA_TEAMS_BY_ID[teamId]?.name || teamId;
};

export const formatSeasonShort = (season: string) => {
  const [start, end] = season.split("-");
  if (!start || !end) {
    return season;
  }
  return `${start.slice(2)}–${end}`;
};

const positionGroup = (position: string): TierPlayer["positionGroup"] => {
  if (position === "C") {
    return "C";
  }
  if (position === "PG" || position === "SG" || position === "G") {
    return "G";
  }
  return "F";
};

const depthIndexFor = (season: string) => {
  if (depthIndexCache?.season === season) {
    return depthIndexCache.byId;
  }
  const byId = new Map<string, Array<{ teamId: string; depth: number }>>();
  NBA_TEAMS.forEach((team) => {
    rawRosterPlayers(team.id, season).forEach((player) => {
      const rows = byId.get(player.id) ?? [];
      rows.push({ teamId: team.id, depth: player.depth });
      byId.set(player.id, rows);
    });
  });
  depthIndexCache = { season, byId };
  return byId;
};

/** ESPN depth-chart unit for a player: 1 = starter PG–C, 2+ backups, 99 extras. */
export const rosterDepthForPlayer = (
  playerId: string,
  teamId?: string | null,
  season = everyTeamCurrentSeason(),
): number | null => {
  if (!loaded || !playerId) {
    return null;
  }
  const rows = depthIndexFor(season).get(playerId);
  if (!rows?.length) {
    return null;
  }
  if (teamId) {
    const hit = rows.find((row) => row.teamId === teamId);
    if (hit) {
      return hit.depth;
    }
  }
  return rows[0]?.depth ?? null;
};

export const withRosterDepth = (
  players: TierPlayer[],
  season = everyTeamCurrentSeason(),
): TierPlayer[] => {
  if (!loaded) {
    return players;
  }
  return players.map((player) => {
    if (player.role === "coach" || player.depth != null) {
      return player;
    }
    const depth = rosterDepthForPlayer(player.id, player.team, season);
    return depth == null ? player : { ...player, depth };
  });
};

export const rosterAsTierPlayers = (
  teamId: string,
  season: string,
): TierPlayer[] => {
  const division = getDivisionForTeam(teamId) ?? "Pacific";
  const conference = getConferenceForTeam(teamId) ?? "West";
  return listRosterPlayers(teamId, season).map((player) => ({
    id: player.id,
    name: player.name,
    team: teamId,
    headshotUrl: player.headshotUrl,
    age: 25,
    heightInches: 78,
    displayHeight: "",
    position: (player.position as TierPlayer["position"]) || "F",
    positionGroup: positionGroup(player.position),
    division,
    conference,
    draftYear: null,
    draftRound: null,
    draftPick: null,
    country: null,
    experienceYears: 0,
    allStar: false,
    ppg: player.pts ?? 0,
    depth: player.depth,
  }));
};

export type EveryTeamStatMetric =
  | "points"
  | "rebounds"
  | "assists"
  | "steals"
  | "blocks"
  | "turnovers"
  | "fgPct"
  | "fg3Pct"
  | "ftPct"
  | "efgPct"
  | "tsPct"
  | "minutes"
  | "games"
  | "pra"
  | "stocks";

export const EVERY_TEAM_STAT_METRICS: Array<{
  id: EveryTeamStatMetric;
  label: string;
  percent?: boolean;
}> = [
  { id: "points", label: "PTS" },
  { id: "rebounds", label: "REB" },
  { id: "assists", label: "AST" },
  { id: "steals", label: "STL" },
  { id: "blocks", label: "BLK" },
  { id: "turnovers", label: "TOV" },
  { id: "fgPct", label: "FG%", percent: true },
  { id: "fg3Pct", label: "3P%", percent: true },
  { id: "ftPct", label: "FT%", percent: true },
  { id: "efgPct", label: "eFG%", percent: true },
  { id: "tsPct", label: "TS%", percent: true },
  { id: "minutes", label: "MIN" },
  { id: "games", label: "GP" },
  { id: "pra", label: "PRA" },
  { id: "stocks", label: "STL+BLK" },
];

const METRIC_FIELDS: Partial<
  Record<EveryTeamStatMetric, keyof EveryTeamRosterPlayer>
> = {
  points: "pts",
  rebounds: "reb",
  assists: "ast",
  steals: "stl",
  blocks: "blk",
  turnovers: "tov",
  fgPct: "fgPct",
  fg3Pct: "fg3Pct",
  ftPct: "ftPct",
  efgPct: "efgPct",
  tsPct: "tsPct",
  minutes: "min",
  games: "gp",
};

export const parseEveryTeamStatMetric = (value: unknown): EveryTeamStatMetric =>
  EVERY_TEAM_STAT_METRICS.some((item) => item.id === value)
    ? (value as EveryTeamStatMetric)
    : "points";

export const isPercentStatMetric = (metric: EveryTeamStatMetric) =>
  Boolean(EVERY_TEAM_STAT_METRICS.find((item) => item.id === metric)?.percent);

export const rosterStatValue = (
  player: EveryTeamRosterPlayer | null,
  metric: EveryTeamStatMetric,
): number | null => {
  if (!player) {
    return null;
  }
  if (metric === "pra") {
    if (player.pts == null || player.reb == null || player.ast == null) {
      return null;
    }
    return roundStat(player.pts + player.reb + player.ast);
  }
  if (metric === "stocks") {
    if (player.stl == null || player.blk == null) {
      return null;
    }
    return roundStat(player.stl + player.blk);
  }
  const field = METRIC_FIELDS[metric];
  if (!field) {
    return null;
  }
  const value = player[field];
  return typeof value === "number" ? value : null;
};

export const playerStatValue = (
  playerId: string,
  season: string,
  metric: EveryTeamStatMetric,
  teamId?: string | null,
  sample: ComposerStatsSample = "regular",
) =>
  rosterStatValue(playerRowForSeason(playerId, season, teamId, sample), metric);

/** Minutes-weighted roster average — team scoring/rates for tier grouping. */
export const teamStatValue = (
  teamId: string,
  season: string,
  metric: EveryTeamStatMetric,
  sample: ComposerStatsSample = "regular",
): number | null => {
  const rows = listRosterPlayers(teamId, season, sample)
    .map((player) => ({
      value: rosterStatValue(player, metric),
      minutes: player.min ?? 0,
    }))
    .filter((row) => row.value != null) as Array<{ value: number; minutes: number }>;
  if (!rows.length) {
    return null;
  }
  const weight = rows.reduce((sum, row) => sum + Math.max(row.minutes, 1), 0);
  const total = rows.reduce(
    (sum, row) => sum + row.value * Math.max(row.minutes, 1),
    0,
  );
  const averaged = total / weight;
  return isPercentStatMetric(metric) ? Math.round(averaged * 1000) / 1000 : roundStat(averaged);
};

export const matchingTeamIds = (
  filters: {
    team?: string;
    division?: string;
    conference?: string;
  } = {},
): string[] => {
  const team = filters.team && filters.team !== "all" ? filters.team : null;
  const division =
    filters.division && filters.division !== "all" ? filters.division : null;
  const conference =
    filters.conference && filters.conference !== "all"
      ? filters.conference
      : null;
  return NBA_TEAMS.filter((item) => {
    if (team && item.id !== team) {
      return false;
    }
    if (division && getDivisionForTeam(item.id) !== division) {
      return false;
    }
    if (conference && getConferenceForTeam(item.id) !== conference) {
      return false;
    }
    return true;
  }).map((item) => item.id);
};

export const pickSeasonLeader = (
  teamId: string,
  season: string,
  metric: EveryTeamStatMetric,
  sample: ComposerStatsSample = "regular",
): EveryTeamRosterPlayer | null => {
  let best: EveryTeamRosterPlayer | null = null;
  let bestValue = Number.NEGATIVE_INFINITY;
  listRosterPlayers(teamId, season, sample).forEach((player) => {
    const value = rosterStatValue(player, metric);
    if (value == null || value < bestValue) {
      return;
    }
    best = player;
    bestValue = value;
  });
  return best;
};

export const roundStat = (value: number) => Math.round(value * 10) / 10;

export const formatRosterStat = (
  player: EveryTeamRosterPlayer | null,
  metric: EveryTeamStatMetric,
) => {
  const value = rosterStatValue(player, metric);
  if (value == null) {
    return "No stats";
  }
  const label =
    EVERY_TEAM_STAT_METRICS.find((item) => item.id === metric)?.label ?? metric;
  if (isPercentStatMetric(metric)) {
    return `${(value * 100).toFixed(1)}% ${label}`;
  }
  if (metric === "games") {
    return `${Math.round(value)} ${label}`;
  }
  return `${value.toFixed(1)} ${label}`;
};
