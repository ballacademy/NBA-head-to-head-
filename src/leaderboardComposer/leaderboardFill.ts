import {
  EVERY_TEAM_STAT_METRICS,
  everyTeamSeasons,
  isPercentStatMetric,
  parseEveryTeamStatMetric,
  roundStat,
  type EveryTeamStatMetric,
} from "../everyTeamComposer/historicalRosters";
import { listLineupStatPool } from "../rankedLineupsComposer/rankedLineupsState";
import type { ComposerStatsSample } from "../instagramComposer/composerStatsSample";
import type { LastGameStats } from "../playerOfTheDayComposer/lastGame";
import type { NightStandout } from "../playerOfTheDayComposer/nightStandouts";
import { splitComposerPersonName } from "../instagramComposer/composerNameStyle";

export { parseEveryTeamStatMetric, EVERY_TEAM_STAT_METRICS };

export const LEADER_GOLD = "#d4af37";
export const LEADER_ROW_MIN = 5;
export const LEADER_ROW_DEFAULT = 8;
export const LEADER_ROW_MAX = 10;
export const LEADER_SQUARE_ROWS = 5;
export const LEADER_TITLE_MAX = 72;
export const LEADER_VALUE_MAX = 12;
export const LEADER_NAME_MAX = 32;
export const LEADER_HEADER_MAX = 24;

export type LeaderWindowKind = "season" | "range";

export interface LeaderRow {
  playerId: string | null;
  teamId: string | null;
  firstName: string;
  lastName: string;
  value: string;
  rawValue: number | null;
  headshotUrl: string | null;
}

export interface LeaderFill {
  playerId: string;
  teamId: string;
  name: string;
  headshotUrl: string | null;
  value: number;
}

export const parseLeaderRowCount = (
  value: unknown,
  fallback = LEADER_ROW_DEFAULT,
) => {
  const n = typeof value === "number" ? value : Number(value);
  if (n === 5 || n === 8 || n === 10) {
    return n;
  }
  if (!Number.isFinite(n)) {
    return fallback;
  }
  const rounded = Math.round(n);
  if (rounded <= 5) {
    return 5;
  }
  if (rounded >= 10) {
    return 10;
  }
  return 8;
};

export const emptyLeaderRow = (): LeaderRow => ({
  playerId: null,
  teamId: null,
  firstName: "",
  lastName: "",
  value: "",
  rawValue: null,
  headshotUrl: null,
});

export const emptyLeaderRows = (count = LEADER_ROW_DEFAULT) =>
  Array.from({ length: parseLeaderRowCount(count) }, emptyLeaderRow);

export const leaderRowOccupied = (row: LeaderRow) =>
  Boolean(
    row.playerId ||
      row.firstName.trim() ||
      row.lastName.trim() ||
      row.value.trim(),
  );

export const visibleLeaderRows = (rows: LeaderRow[], exporting: boolean) =>
  exporting ? rows.filter(leaderRowOccupied) : rows;

export const squareLeaderRows = (rows: LeaderRow[], square: boolean) =>
  square ? rows.slice(0, LEADER_SQUARE_ROWS) : rows;

export const metricLabel = (metric: EveryTeamStatMetric) =>
  EVERY_TEAM_STAT_METRICS.find((item) => item.id === metric)?.label ?? metric;

export const parseMakesAttempts = (value: string | undefined) => {
  const match = String(value ?? "")
    .trim()
    .match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/);
  if (!match) {
    return null;
  }
  const made = Number(match[1]);
  const attempts = Number(match[2]);
  if (!Number.isFinite(made) || !Number.isFinite(attempts) || attempts <= 0) {
    return null;
  }
  return made / attempts;
};

const parseBoxNumber = (value: string | undefined) => {
  const n = Number.parseFloat(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
};

/** Box-score metrics only. Advanced / hustle stay null — never invent. */
export const nightStatValue = (
  stats: LastGameStats | null | undefined,
  metric: EveryTeamStatMetric,
  games?: number,
): number | null => {
  if (!stats) {
    return null;
  }
  if (metric === "games") {
    return games && games > 0 ? games : 1;
  }
  if (metric === "points") {
    return parseBoxNumber(stats.pts);
  }
  if (metric === "rebounds") {
    return parseBoxNumber(stats.reb);
  }
  if (metric === "assists") {
    return parseBoxNumber(stats.ast);
  }
  if (metric === "steals") {
    return parseBoxNumber(stats.stl);
  }
  if (metric === "blocks") {
    return parseBoxNumber(stats.blk);
  }
  if (metric === "turnovers") {
    return parseBoxNumber(stats.tov);
  }
  if (metric === "minutes") {
    return parseBoxNumber(stats.min);
  }
  if (metric === "pra") {
    const pts = parseBoxNumber(stats.pts);
    const reb = parseBoxNumber(stats.reb);
    const ast = parseBoxNumber(stats.ast);
    if (pts == null || reb == null || ast == null) {
      return null;
    }
    return roundStat(pts + reb + ast);
  }
  if (metric === "stocks") {
    const stl = parseBoxNumber(stats.stl);
    const blk = parseBoxNumber(stats.blk);
    if (stl == null || blk == null) {
      return null;
    }
    return roundStat(stl + blk);
  }
  if (metric === "fgPct") {
    return parseMakesAttempts(stats.fg);
  }
  if (metric === "fg3Pct") {
    return parseMakesAttempts(stats.three);
  }
  if (metric === "ftPct") {
    return parseMakesAttempts(stats.ft);
  }
  return null;
};

export const formatLeaderValue = (
  value: number | null,
  metric: EveryTeamStatMetric,
  windowKind: LeaderWindowKind = "season",
) => {
  if (value == null || !Number.isFinite(value)) {
    return "";
  }
  if (isPercentStatMetric(metric)) {
    const pct = value <= 1 ? value * 100 : value;
    return `${pct.toFixed(1)}%`;
  }
  if (metric === "games") {
    return String(Math.round(value));
  }
  if (windowKind === "range" && Number.isInteger(value)) {
    return String(value);
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
};

export const leaderTitleFor = (
  metric: EveryTeamStatMetric,
  windowKind: LeaderWindowKind,
) => {
  const label = metricLabel(metric);
  if (windowKind === "season") {
    if (metric === "points") {
      return "PPG LEADERS";
    }
    return `${label} LEADERS`;
  }
  if (metric === "points") {
    return "PTS LEADERS";
  }
  return `${label} LEADERS`;
};

export const columnHeaderFor = (metric: EveryTeamStatMetric) => {
  if (metric === "points") {
    return "SCORING";
  }
  if (metric === "assists") {
    return "ASSISTS";
  }
  if (metric === "rebounds") {
    return "REBOUNDS";
  }
  return metricLabel(metric);
};

const compareFills = (left: LeaderFill, right: LeaderFill) =>
  right.value - left.value || left.name.localeCompare(right.name);

export const listSeasonLeaders = (
  season: string,
  metric: EveryTeamStatMetric,
  sample: ComposerStatsSample = "regular",
  count = LEADER_ROW_DEFAULT,
): LeaderFill[] => {
  const take = parseLeaderRowCount(count);
  const fromSeason = (year: string) =>
    listLineupStatPool(year, metric, sample).map((row) => ({
      playerId: row.player.id,
      teamId: row.teamId,
      name: row.player.name,
      headshotUrl: row.player.headshotUrl || null,
      value: row.value,
    }));
  let pool = fromSeason(season);
  if (!pool.length) {
    const previous = everyTeamSeasons().find((year) => year !== season);
    if (previous) {
      pool = fromSeason(previous);
    }
  }
  return pool.sort(compareFills).slice(0, take);
};

export const listNightLeaders = (
  rows: NightStandout[],
  metric: EveryTeamStatMetric,
  count = LEADER_ROW_DEFAULT,
): LeaderFill[] => {
  const take = parseLeaderRowCount(count);
  const fills: LeaderFill[] = [];
  for (const row of rows) {
    const value = nightStatValue(row.game.stats, metric, row.games);
    if (value == null) {
      continue;
    }
    fills.push({
      playerId: row.athleteId,
      teamId: row.teamId,
      name: row.name,
      headshotUrl: null,
      value,
    });
  }
  return fills.sort(compareFills).slice(0, take);
};

export const fillToLeaderRows = (
  current: LeaderRow[],
  fills: LeaderFill[],
  metric: EveryTeamStatMetric,
  windowKind: LeaderWindowKind,
): LeaderRow[] => {
  const count = parseLeaderRowCount(current.length);
  return Array.from({ length: count }, (_, index) => {
    const fill = fills[index];
    if (!fill) {
      return emptyLeaderRow();
    }
    const names = splitComposerPersonName(fill.name);
    return {
      playerId: fill.playerId,
      teamId: fill.teamId,
      firstName: names.firstName.slice(0, LEADER_NAME_MAX),
      lastName: names.lastName.slice(0, LEADER_NAME_MAX),
      value: formatLeaderValue(fill.value, metric, windowKind).slice(
        0,
        LEADER_VALUE_MAX,
      ),
      rawValue: fill.value,
      headshotUrl: fill.headshotUrl,
    };
  });
};

export const resizeLeaderRows = (rows: LeaderRow[], count: number) => {
  const n = parseLeaderRowCount(count);
  if (rows.length === n) {
    return rows;
  }
  if (rows.length > n) {
    return rows.slice(0, n);
  }
  return [...rows, ...emptyLeaderRows(n - rows.length)];
};

export const patchLeaderRow = (
  rows: LeaderRow[],
  index: number,
  patch: Partial<LeaderRow>,
) => {
  if (index < 0 || index >= rows.length) {
    return rows;
  }
  const next = rows.slice();
  next[index] = { ...next[index]!, ...patch };
  return next;
};

export const leaderRowName = (row: LeaderRow) =>
  `${row.firstName} ${row.lastName}`.replace(/\s+/g, " ").trim();

export const leaderCaptionLines = (title: string, rows: LeaderRow[]) => {
  const names = visibleLeaderRows(rows, true).map((row, index) => {
    const name = leaderRowName(row) || "—";
    const value = row.value.trim();
    return value ? `${index + 1}. ${name} ${value}` : `${index + 1}. ${name}`;
  });
  return [title, ...names];
};

export const maxLeaderRaw = (rows: LeaderRow[]) => {
  const values = rows
    .map((row) => row.rawValue)
    .filter((value): value is number => value != null && value > 0);
  return values.length ? Math.max(...values) : 1;
};

export const barWidthPct = (row: LeaderRow, max: number) => {
  if (row.rawValue == null || max <= 0) {
    return 0;
  }
  return Math.max(6, Math.min(100, (row.rawValue / max) * 100));
};
