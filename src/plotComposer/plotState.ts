import type { ComposerStatsSample } from "../instagramComposer/composerStatsSample";
import { splitBalancedTitle } from "../instagramComposer/titleLayout";
import { DEFAULT_BRAND } from "../standingsComposer/rankingState";
import { NBA_TEAMS, getTeam } from "../standingsComposer/teams";
import {
  EVERY_TEAM_STAT_METRICS,
  isPercentStatMetric,
  listRosterPlayers,
  matchingTeamIds,
  parseEveryTeamStatMetric,
  playerStatValue,
  rosterStatValue,
  teamLogoSrc,
  teamStatValue,
  type EveryTeamRosterPlayer,
  type EveryTeamStatMetric,
} from "../everyTeamComposer/historicalRosters";
import {
  EMPTY_PLAYER_FILTERS,
  getPlayer,
  isEmptyPlayerFilters,
  parsePlayerSearchFilters,
  searchPlayers,
  type PlayerSearchFilters,
  type TierPlayer,
} from "../tierListComposer/nbaActivePlayers";
import { officialTeamStatValue } from "../everyTeamComposer/teamSeasonStats";
import { splitPlayerName } from "../teamOfTheWeekComposer/teamOfTheWeekState";
import { PLOT_TITLE_TRACK } from "./plotLayout";

export { DEFAULT_BRAND };

export const DEFAULT_PLOT_TITLE = "PTS VS AST";
export const PLOT_TITLE_MAX = 72;
export type PlotSubject = "teams" | "players";

export interface PlotPoint {
  id: string;
  kind: "team" | "player";
  label: string;
  shortLabel: string;
  teamId: string;
  x: number;
  y: number;
  photoSrc: string | null;
}

export interface PlotDraft {
  brand: string;
  title: string;
  subject: PlotSubject;
  xMetric: EveryTeamStatMetric;
  yMetric: EveryTeamStatMetric;
  season: string;
  points: PlotPoint[];
  pinnedIds: string[];
  showBa?: boolean;
  showNames?: boolean;
  filters?: PlayerSearchFilters;
}

export const plotMetricLabel = (metric: EveryTeamStatMetric) =>
  EVERY_TEAM_STAT_METRICS.find((item) => item.id === metric)?.label ?? metric;

export const parsePlotSubject = (value: unknown): PlotSubject =>
  value === "players" ? "players" : "teams";

export const autoPlotTitle = (
  xMetric: EveryTeamStatMetric,
  yMetric: EveryTeamStatMetric,
  _subject?: PlotSubject,
) => `${plotMetricLabel(xMetric)} VS ${plotMetricLabel(yMetric)}`;

export const splitPlotTitle = (title: string) =>
  splitBalancedTitle(title, DEFAULT_PLOT_TITLE, PLOT_TITLE_TRACK);

export const plotKicker = (
  subject: PlotSubject,
  count: number,
  populated: boolean,
) => {
  if (!populated) {
    return subject === "teams" ? "POPULATE TO PLOT TEAMS" : "POPULATE TO PLOT PLAYERS";
  }
  if (subject === "teams") {
    return `${count} NBA TEAM${count === 1 ? "" : "S"}`;
  }
  return `${count} NBA PLAYER${count === 1 ? "" : "S"}`;
};

export const defaultPlotDraft = (season = "2026-27"): PlotDraft => ({
  brand: DEFAULT_BRAND,
  title: DEFAULT_PLOT_TITLE,
  subject: "teams",
  xMetric: "points",
  yMetric: "assists",
  season,
  points: [],
  pinnedIds: [],
  showBa: true,
  showNames: true,
  filters: { ...EMPTY_PLAYER_FILTERS },
});

const isPlotPoint = (value: unknown): value is PlotPoint =>
  Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as PlotPoint).id === "string" &&
      ((value as PlotPoint).kind === "team" ||
        (value as PlotPoint).kind === "player") &&
      typeof (value as PlotPoint).label === "string" &&
      typeof (value as PlotPoint).shortLabel === "string" &&
      typeof (value as PlotPoint).teamId === "string" &&
      typeof (value as PlotPoint).x === "number" &&
      typeof (value as PlotPoint).y === "number" &&
      (typeof (value as PlotPoint).photoSrc === "string" ||
        (value as PlotPoint).photoSrc === null),
  );

export const isPlotDraft = (value: unknown): value is PlotDraft =>
  Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as PlotDraft).brand === "string" &&
      typeof (value as PlotDraft).title === "string" &&
      parsePlotSubject((value as PlotDraft).subject) &&
      typeof (value as PlotDraft).season === "string" &&
      Array.isArray((value as PlotDraft).points) &&
      (value as PlotDraft).points.every(isPlotPoint) &&
      Array.isArray((value as PlotDraft).pinnedIds),
  );

export const normalizePlotDraft = (
  draft: Partial<PlotDraft>,
  season = draft.season || "2026-27",
): PlotDraft => {
  const empty = defaultPlotDraft(season);
  return {
    ...empty,
    ...draft,
    brand: draft.brand?.trim() ? draft.brand : empty.brand,
    title: draft.title?.trim() ? draft.title : empty.title,
    subject: parsePlotSubject(draft.subject),
    xMetric: parseEveryTeamStatMetric(draft.xMetric),
    yMetric: parseEveryTeamStatMetric(draft.yMetric),
    season,
    points: Array.isArray(draft.points) ? draft.points.filter(isPlotPoint) : [],
    pinnedIds: Array.isArray(draft.pinnedIds)
      ? draft.pinnedIds.filter((id): id is string => typeof id === "string")
      : [],
    showBa: draft.showBa !== false,
    showNames: draft.showNames !== false,
    filters: parsePlayerSearchFilters(draft.filters),
  };
};

const qualifiesForMetric = (
  player: EveryTeamRosterPlayer,
  metric: EveryTeamStatMetric,
) => {
  if (rosterStatValue(player, metric) == null) {
    return false;
  }
  if (isPercentStatMetric(metric)) {
    return (player.min ?? 0) >= 12 && (player.gp ?? 0) >= 8;
  }
  return true;
};

export const populatePlotTeams = (
  season: string,
  xMetric: EveryTeamStatMetric,
  yMetric: EveryTeamStatMetric,
  filters: PlayerSearchFilters,
  sample: ComposerStatsSample = "regular",
): PlotPoint[] => {
  const ids = matchingTeamIds({
    team: filters.team,
    division: filters.division,
    conference: filters.conference,
  });
  const next: PlotPoint[] = [];
  ids.forEach((teamId) => {
    const x =
      officialTeamStatValue(teamId, season, xMetric, sample) ??
      teamStatValue(teamId, season, xMetric, sample);
    const y =
      officialTeamStatValue(teamId, season, yMetric, sample) ??
      teamStatValue(teamId, season, yMetric, sample);
    const team = getTeam(teamId) ?? NBA_TEAMS.find((row) => row.id === teamId);
    if (x == null || y == null || !team) {
      return;
    }
    next.push({
      id: teamId,
      kind: "team",
      label: team.id,
      shortLabel: team.id,
      teamId,
      x,
      y,
      photoSrc: teamLogoSrc(teamId, season, true),
    });
  });
  return next;
};

const uniqueRosterPool = (
  season: string,
  sample: ComposerStatsSample,
) => {
  const byId = new Map<string, { player: EveryTeamRosterPlayer; teamId: string }>();
  NBA_TEAMS.forEach((team) => {
    listRosterPlayers(team.id, season, sample).forEach((player) => {
      if (!player.id || player.position === "HC") {
        return;
      }
      const previous = byId.get(player.id);
      if (!previous || (player.min ?? 0) > (previous.player.min ?? 0)) {
        byId.set(player.id, { player, teamId: team.id });
      }
    });
  });
  return [...byId.values()];
};

const rosterAsSearchPlayer = (
  player: EveryTeamRosterPlayer,
  teamId: string,
): TierPlayer => {
  const live = getPlayer(player.id);
  if (live) {
    return {
      ...live,
      team: teamId,
      position: (player.position as TierPlayer["position"]) || live.position,
      headshotUrl: player.headshotUrl || live.headshotUrl,
    };
  }
  return {
    id: player.id,
    name: player.name,
    team: teamId,
    headshotUrl: player.headshotUrl,
    age: 25,
    heightInches: 78,
    displayHeight: "",
    position: (player.position as TierPlayer["position"]) || "F",
    positionGroup:
      player.position === "C"
        ? "C"
        : player.position === "PG" || player.position === "SG"
          ? "G"
          : "F",
    division: "Pacific",
    conference: getTeam(teamId)?.conference ?? "West",
    draftYear: null,
    draftRound: null,
    draftPick: null,
    country: null,
    experienceYears: 0,
    allStar: false,
    ppg: player.pts ?? 0,
  };
};

export const populatePlotPlayers = (
  season: string,
  xMetric: EveryTeamStatMetric,
  yMetric: EveryTeamStatMetric,
  filters: PlayerSearchFilters,
  pinnedIds: string[],
  sample: ComposerStatsSample = "regular",
): PlotPoint[] => {
  const pool = uniqueRosterPool(season, sample);
  const pinned = new Set(pinnedIds.filter(Boolean));
  const catalog = pool.map((row) => rosterAsSearchPlayer(row.player, row.teamId));
  const matched = isEmptyPlayerFilters(filters)
    ? catalog
    : searchPlayers("", filters, catalog);
  const allowed = pinned.size
    ? pinned
    : new Set(matched.map((player) => player.id));
  const next: PlotPoint[] = [];
  pool.forEach((row) => {
    if (!allowed.has(row.player.id)) {
      return;
    }
    const pinnedRow = pinned.has(row.player.id);
    if (
      !pinnedRow &&
      (!qualifiesForMetric(row.player, xMetric) ||
        !qualifiesForMetric(row.player, yMetric))
    ) {
      return;
    }
    const x = playerStatValue(row.player.id, season, xMetric, row.teamId, sample);
    const y = playerStatValue(row.player.id, season, yMetric, row.teamId, sample);
    if (x == null || y == null) {
      return;
    }
    const names = splitPlayerName(row.player.name);
    next.push({
      id: row.player.id,
      kind: "player",
      label: names.lastName || row.player.name,
      shortLabel: names.lastName || row.player.name,
      teamId: row.teamId,
      x,
      y,
      photoSrc: row.player.headshotUrl || null,
    });
  });
  return next;
};

export const populatePlotPoints = (
  subject: PlotSubject,
  season: string,
  xMetric: EveryTeamStatMetric,
  yMetric: EveryTeamStatMetric,
  filters: PlayerSearchFilters,
  pinnedIds: string[] = [],
  sample: ComposerStatsSample = "regular",
) =>
  subject === "teams"
    ? populatePlotTeams(season, xMetric, yMetric, filters, sample)
    : populatePlotPlayers(season, xMetric, yMetric, filters, pinnedIds, sample);

export const pinPlotPlayer = (ids: string[], playerId: string) =>
  ids.includes(playerId) ? ids : [...ids, playerId];

export const unpinPlotPlayer = (ids: string[], playerId: string) =>
  ids.filter((id) => id !== playerId);

export const plotCaptionNames = (points: PlotPoint[]) =>
  points.slice(0, 12).map((point) => point.label);
