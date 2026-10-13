import {
  getConferenceForTeam,
  getDivisionForTeam,
} from "../lib/divisions";
import { NBA_TEAMS_BY_ID } from "../standingsComposer/teams";
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
}

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

export const EVERY_TEAM_SORT_KEY = "ddgm:every-team-player-sort";

export const isEveryTeamRostersReady = () => loaded;

export const everyTeamSeasons = () => seasons;

export const everyTeamCurrentSeason = () => currentSeason;

export const hydrateEveryTeamRosters = (payload: HistoricalCatalog) => {
  currentSeason = payload.currentSeason;
  seasons = payload.seasons.slice();
  rosters = payload.rosters;
  loaded = true;
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

export const listRosterPlayers = (
  teamId: string,
  season: string,
): EveryTeamRosterPlayer[] => {
  const cell = getSeasonCell(teamId, season);
  if (!cell || cell.missing) {
    return [];
  }
  return cell.players ?? [];
};

export const getRosterPlayer = (
  teamId: string,
  season: string,
  playerId: string | null | undefined,
): EveryTeamRosterPlayer | null => {
  if (!playerId) {
    return null;
  }
  return listRosterPlayers(teamId, season).find((player) => player.id === playerId) ?? null;
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

export type EveryTeamStatMetric = "pra" | "points" | "stocks";

export const rosterStatValue = (
  player: EveryTeamRosterPlayer | null,
  metric: EveryTeamStatMetric,
): number | null => {
  if (!player) {
    return null;
  }
  if (metric === "points") {
    return player.pts;
  }
  if (metric === "pra") {
    if (player.pts == null || player.reb == null || player.ast == null) {
      return null;
    }
    return roundStat(player.pts + player.reb + player.ast);
  }
  if (player.stl == null || player.blk == null) {
    return null;
  }
  return roundStat(player.stl + player.blk);
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
  if (metric === "points") {
    return `${value.toFixed(1)} PTS`;
  }
  if (metric === "pra") {
    return `${value.toFixed(1)} PRA`;
  }
  return `${value.toFixed(1)} STL+BLK`;
};
