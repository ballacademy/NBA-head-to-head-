import {
  everyTeamCurrentSeason,
  playerRowForSeason,
} from "../everyTeamComposer/historicalRosters";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import { datesInInclusiveRange } from "../instagramComposer/composerDateRange";
import {
  competitorScore,
  emptyStats,
  formatDateLabel,
  formatResultLine,
  isoDateOnly,
  playerGameResult,
  resolveTeamId,
  shiftIsoDate,
  toEspnDateParam,
  type LastGame,
  type LastGameStats,
} from "./lastGame";

export const ESPN_SCOREBOARD_URL = (iso: string) =>
  `https://site.web.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${toEspnDateParam(iso)}`;

export const ESPN_SUMMARY_URL = (eventId: string) =>
  `https://site.web.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${encodeURIComponent(eventId)}`;

export interface NightStandout {
  athleteId: string;
  name: string;
  teamId: string;
  badge: string;
  flags: string[];
  line: string;
  score: number;
  game: LastGame;
  /** Minute-played appearances in a merged range. One game if omitted. */
  games?: number;
  /** ESPN in-progress (Q4 / OT / halftime). Recs for Stat card + POTD skip these. */
  live?: boolean;
  /** ESPN final (including Final/OT). Undefined on fixtures means completed. */
  final?: boolean;
}

interface EspnCompetitor {
  score?: string | { displayValue?: string };
  winner?: boolean;
  homeAway?: string;
  team?: { abbreviation?: string; displayName?: string; id?: string };
}

interface EspnStatusType {
  completed?: boolean;
  state?: string;
  description?: string;
  name?: string;
  detail?: string;
  shortDetail?: string;
}

interface EspnScoreboardEvent {
  id?: string;
  date?: string;
  status?: { type?: EspnStatusType };
  competitions?: Array<{
    competitors?: EspnCompetitor[];
    status?: { type?: EspnStatusType };
  }>;
}

export type EspnGameStatus = {
  live: boolean;
  final: boolean;
};

const upperStatus = (value: unknown) => String(value ?? "").toUpperCase();

const espnStatusTypeOf = (event: EspnScoreboardEvent) =>
  event.status?.type ?? event.competitions?.[0]?.status?.type;

/** Q4 / OT / halftime / in-progress — never a final. */
export const espnEventIsLive = (event: EspnScoreboardEvent) => {
  const type = espnStatusTypeOf(event);
  if (!type || type.completed === true) {
    return false;
  }
  const state = String(type.state ?? "").toLowerCase();
  const name = upperStatus(type.name);
  const desc = upperStatus(type.description);
  const detail = upperStatus(type.detail ?? type.shortDetail);
  if (state === "in") {
    return true;
  }
  if (
    name === "STATUS_IN_PROGRESS" ||
    name === "STATUS_HALFTIME" ||
    name.includes("END_PERIOD") ||
    name.includes("END_OF_PERIOD")
  ) {
    return true;
  }
  return /\b(Q[1-4]|OT|HALFTIME)\b/.test(`${desc} ${detail}`);
};

/** Finals only — `completed` or STATUS_FINAL / Final/OT. Q4 and OT clocks are live. */
export const espnEventIsFinal = (event: EspnScoreboardEvent) => {
  if (espnEventIsLive(event)) {
    return false;
  }
  const type = espnStatusTypeOf(event);
  if (!type) {
    return false;
  }
  if (type.completed === true) {
    return true;
  }
  const name = upperStatus(type.name);
  const desc = upperStatus(type.description).trim();
  return (
    name === "STATUS_FINAL" ||
    name === "STATUS_FINAL_OT" ||
    /_FINAL$/.test(name) ||
    /^FINAL(\b|\/OT)/.test(desc)
  );
};

export const espnGameStatus = (event: EspnScoreboardEvent): EspnGameStatus => ({
  live: espnEventIsLive(event),
  final: espnEventIsFinal(event),
});

/** Stat card + POTD recs default to completed games. Fixtures without flags count as done. */
export const isCompletedNightRow = (row: {
  live?: boolean;
  final?: boolean;
}) => row.live !== true && row.final !== false;

export const completedNightRows = <T extends { live?: boolean; final?: boolean }>(
  rows: T[],
) => rows.filter(isCompletedNightRow);

export interface EspnScoreboardPayload {
  events?: EspnScoreboardEvent[];
}

interface EspnBoxAthlete {
  athlete?: { id?: string; displayName?: string };
  stats?: string[];
}

interface EspnBoxTeam {
  team?: { abbreviation?: string; displayName?: string; id?: string };
  statistics?: Array<{
    keys?: string[];
    labels?: string[];
    athletes?: EspnBoxAthlete[];
  }>;
}

export interface EspnSummaryPayload {
  boxscore?: { players?: EspnBoxTeam[] };
  header?: {
    competitions?: Array<{
      competitors?: EspnCompetitor[];
      date?: string;
    }>;
  };
}

const BOX_KEY: Record<string, keyof LastGameStats> = {
  minutes: "min",
  MIN: "min",
  points: "pts",
  PTS: "pts",
  rebounds: "reb",
  REB: "reb",
  assists: "ast",
  AST: "ast",
  steals: "stl",
  STL: "stl",
  blocks: "blk",
  BLK: "blk",
  turnovers: "tov",
  TO: "tov",
  "fieldGoalsMade-fieldGoalsAttempted": "fg",
  FG: "fg",
  "threePointFieldGoalsMade-threePointFieldGoalsAttempted": "three",
  "3PT": "three",
  "freeThrowsMade-freeThrowsAttempted": "ft",
  FT: "ft",
};

const n = (value: string) => {
  const parsed = Number.parseFloat(String(value).split("-")[0] ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
};

export const parseMadeAttempted = (value: string | undefined) => {
  const [madeRaw, attemptedRaw] = String(value ?? "0-0").split("-");
  const made = Number.parseFloat(madeRaw ?? "");
  const attempted = Number.parseFloat(attemptedRaw ?? "");
  return {
    made: Number.isFinite(made) ? made : 0,
    attempted: Number.isFinite(attempted) ? attempted : 0,
  };
};

const formatMadeAttempted = (made: number, attempted: number) =>
  `${made}-${attempted}`;

const addMadeAttempted = (left?: string, right?: string) => {
  const a = parseMadeAttempted(left);
  const b = parseMadeAttempted(right);
  return formatMadeAttempted(a.made + b.made, a.attempted + b.attempted);
};

const averageMadeAttempted = (value: string | undefined, games: number) => {
  const { made, attempted } = parseMadeAttempted(value);
  const gp = Math.max(1, games);
  return formatMadeAttempted(made / gp, attempted / gp);
};

export const statsFromBoxRow = (
  keys: string[],
  values: string[],
): LastGameStats => {
  const stats = emptyStats();
  keys.forEach((key, index) => {
    const field = BOX_KEY[key] ?? BOX_KEY[key.toUpperCase()];
    const value = values[index];
    if (field && value) {
      stats[field] = value;
    }
  });
  return stats;
};

/** Skip 0–5 point cameos no matter the usual average. */
export const STANDOUT_MIN_PTS = 6;

export const nightFlagsFor = (stats: LastGameStats) => {
  const pts = n(stats.pts);
  const reb = n(stats.reb);
  const ast = n(stats.ast);
  const stl = n(stats.stl);
  const blk = n(stats.blk);
  const stocks = stl + blk;
  const pra = pts + reb + ast;
  const tens = [pts, reb, ast, stl, blk].filter((value) => value >= 10).length;
  const flags: string[] = [];
  if (tens >= 3) {
    flags.push("Triple-double");
  } else if (tens >= 2) {
    flags.push("Double-double");
  }
  if (pts >= 40) {
    flags.push("40+ PTS");
  } else if (pts >= 30) {
    flags.push("30+ PTS");
  }
  if (stocks >= 5) {
    flags.push("Big stocks");
  } else if (blk >= 4) {
    flags.push("Blocks");
  } else if (stl >= 4) {
    flags.push("Steals");
  }
  if (pra >= 35 && tens < 3) {
    flags.push("High PRA");
  }
  if (ast >= 8 && pts < STANDOUT_MIN_PTS) {
    flags.push("Dimes");
  }
  if (reb >= 10 && pts < STANDOUT_MIN_PTS) {
    flags.push("Boards");
  }
  return {
    pts,
    reb,
    ast,
    stl,
    blk,
    stocks,
    pra,
    tens,
    flags,
    score: pts + pra * 0.35 + stocks * 5 + tens * 18,
  };
};

export interface UsualLine {
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
}

export const usualLineFor = (athleteId: string): UsualLine => {
  const player = getPlayer(athleteId);
  const row = playerRowForSeason(
    athleteId,
    everyTeamCurrentSeason(),
    player?.team ?? null,
  );
  return {
    pts: row?.pts ?? player?.ppg ?? 0,
    reb: row?.reb ?? 0,
    ast: row?.ast ?? 0,
    stl: row?.stl ?? 0,
    blk: row?.blk ?? 0,
  };
};

/** High AST/REB/stocks still flag when PTS is tiny — not only ~10-block nights. */
export const isFreakNonScoringNight = (
  extra: ReturnType<typeof nightFlagsFor>,
) =>
  extra.blk >= 5 ||
  extra.stl >= 5 ||
  extra.stocks >= 7 ||
  extra.reb >= 10 ||
  extra.ast >= 8 ||
  (extra.reb >= 8 && extra.ast >= 6) ||
  extra.tens >= 2;

/** Bench / two-way surprise vs their usual line — not star-vs-star ranking. */
export const isSurpriseNight = (
  extra: ReturnType<typeof nightFlagsFor>,
  usual: UsualLine,
) => {
  const usualPra = usual.pts + usual.reb + usual.ast;
  const usualStocks = usual.stl + usual.blk;
  const ptsJump =
    usual.pts > 0 &&
    extra.pts >= Math.max(10, usual.pts * 1.75) &&
    extra.pts >= usual.pts + 6;
  const praJump =
    usualPra > 0 &&
    extra.pra >= Math.max(14, usualPra * 1.75) &&
    extra.pra >= usualPra + 8;
  const stocksJump = extra.stocks >= 3 && extra.stocks >= usualStocks + 2;
  return ptsJump || praJump || stocksJump;
};

export const isNotableNight = (
  extra: ReturnType<typeof nightFlagsFor>,
  usual: UsualLine,
) => {
  if (extra.pts < STANDOUT_MIN_PTS && !isFreakNonScoringNight(extra)) {
    return false;
  }
  if (extra.flags.length > 0) {
    return true;
  }
  if (extra.pts >= 14 || extra.pra >= 20) {
    return true;
  }
  if (extra.stl >= 2 || extra.blk >= 2 || extra.stocks >= 3) {
    return true;
  }
  return isSurpriseNight(extra, usual);
};

export const TOTW_TS_REF = 0.55;
export const TOTW_EFG_REF = 0.52;
export const TOTW_TS_SHARE = 0.75;
export const TOTW_EFG_SHARE = 0.25;
export const TOTW_EFF_MIN = 0.88;
export const TOTW_EFF_MAX = 1.12;
export const TOTW_EFF_FGA_REF = 12;
export const TOTW_MIN_FGA = 5;
export const TOTW_STOCKS_WEIGHT = 4;
export const TOTW_TENS_WEIGHT = 10;
export const TOTW_PRA_WEIGHT = 0.35;
export const TOTW_TOV_WEIGHT = 2.5;

export const totwShooting = (stats: LastGameStats) => {
  const fg = parseMadeAttempted(stats.fg);
  const three = parseMadeAttempted(stats.three);
  const ft = parseMadeAttempted(stats.ft);
  const pts = Number.parseFloat(stats.pts);
  const efg =
    fg.attempted > 0 ? (fg.made + 0.5 * three.made) / fg.attempted : null;
  const tsDenom = 2 * (fg.attempted + 0.44 * ft.attempted);
  const ts =
    tsDenom > 0 && Number.isFinite(pts) ? pts / tsDenom : null;
  return { fg, three, ft, efg, ts, fga: fg.attempted };
};

/** Counting line. Turnovers dock empty-calorie scoring volume. */
export const totwCountingScore = (stats: LastGameStats) => {
  const extra = nightFlagsFor(stats);
  const tov = Number.parseFloat(stats.tov);
  const turnovers = Number.isFinite(tov) ? tov : 0;
  return (
    extra.pts +
    extra.pra * TOTW_PRA_WEIGHT +
    extra.stocks * TOTW_STOCKS_WEIGHT +
    extra.tens * TOTW_TENS_WEIGHT -
    turnovers * TOTW_TOV_WEIGHT
  );
};

/**
 * Blend TS% vs 55% and eFG% vs 52%. Tiny samples stay neutral.
 * Clamped ±12% so counting still carries.
 */
export const totwEfficiencyIndex = (stats: LastGameStats) => {
  const { efg, ts, fga } = totwShooting(stats);
  if (fga < TOTW_MIN_FGA || ts == null || efg == null) {
    return 1;
  }
  const raw =
    TOTW_TS_SHARE * (ts / TOTW_TS_REF) + TOTW_EFG_SHARE * (efg / TOTW_EFG_REF);
  const clamped = Math.min(TOTW_EFF_MAX, Math.max(TOTW_EFF_MIN, raw));
  const volume = Math.min(1, fga / TOTW_EFF_FGA_REF);
  return 1 + (clamped - 1) * volume;
};

export const surpriseBonus = (
  extra: ReturnType<typeof nightFlagsFor>,
  usual: UsualLine,
) => {
  if (!isSurpriseNight(extra, usual)) {
    return 0;
  }
  const usualPra = usual.pts + usual.reb + usual.ast;
  return (
    Math.max(0, extra.pts - usual.pts) * 1.25 +
    Math.max(0, extra.pra - usualPra) * 0.3
  );
};

const standoutLine = (
  stats: LastGameStats,
  extra: ReturnType<typeof nightFlagsFor>,
) => {
  const bits = [
    `${stats.pts} PTS`,
    `${stats.reb} REB`,
    `${stats.ast} AST`,
  ];
  if (extra.stocks >= 3) {
    bits.push(`${stats.stl} STL`, `${stats.blk} BLK`);
  }
  return bits.join(" · ");
};

/** Big counting nights still sit in Standouts even with TOs or a cold TS. */
export const isStandoutOverRoughNight = (
  extra: ReturnType<typeof nightFlagsFor>,
) => extra.pts >= 30 || extra.tens >= 2 || extra.flags.length > 0;

/** Whole notable slate — no per-game or global star cap. Picker scrolls. */
export const rankNightStandouts = (rows: NightStandout[]) => {
  const seen = new Set<string>();
  const notable: NightStandout[] = [];
  for (const row of rows) {
    if (n(row.game.stats.min) <= 0 || seen.has(row.athleteId)) {
      continue;
    }
    const extra = nightFlagsFor(row.game.stats);
    const usual = usualLineFor(row.athleteId);
    /** Brick / 6+ TO nights belong on Rough night, not the impressive strip. */
    if (
      isRoughNight(row.game.stats, usual, row.athleteId) &&
      !isStandoutOverRoughNight(extra)
    ) {
      continue;
    }
    if (!isNotableNight(extra, usual)) {
      continue;
    }
    seen.add(row.athleteId);
    notable.push(row);
  }
  return notable.sort((a, b) => b.score - a.score);
};

const eventIsPlayed = (event: EspnScoreboardEvent) => {
  const state =
    event.status?.type?.state ??
    event.competitions?.[0]?.status?.type?.state ??
    "";
  if (state === "pre") {
    return false;
  }
  return (
    event.status?.type?.completed === true ||
    state === "in" ||
    state === "post"
  );
};

export const nightStandoutFromBox = (
  athleteId: string,
  name: string,
  teamId: string,
  opponent: { id: string; abbrev: string; score: string },
  ours: { score: string; winner?: boolean; home?: boolean },
  eventId: string,
  gameDate: string,
  stats: LastGameStats,
  includeQuiet = false,
  gameStatus?: EspnGameStatus,
): NightStandout | null => {
  if (!athleteId || n(stats.min) <= 0) {
    return null;
  }
  const extra = nightFlagsFor(stats);
  if (
    !includeQuiet &&
    extra.pts < STANDOUT_MIN_PTS &&
    !isFreakNonScoringNight(extra)
  ) {
    return null;
  }
  const usual = usualLineFor(athleteId);
  const surprise = isSurpriseNight(extra, usual);
  const flags =
    surprise &&
    !extra.flags.includes("30+ PTS") &&
    !extra.flags.includes("40+ PTS")
      ? [...extra.flags, "Hot night"]
      : extra.flags;
  const result = playerGameResult(ours.score, opponent.score, ours.winner);
  const home = ours.home === true;
  return {
    athleteId,
    name,
    teamId,
    badge:
      extra.flags[0] ??
      (extra.pts >= 20 ? "Points" : surprise ? "Hot night" : "Standout"),
    flags,
    line: standoutLine(stats, extra),
    score: extra.score + surpriseBonus(extra, usual),
    game: {
      eventId,
      gameDate,
      teamId,
      opponentId: opponent.id,
      opponentAbbrev: opponent.abbrev,
      result,
      playerScore: ours.score,
      opponentScore: opponent.score,
      home,
      resultLine: formatResultLine(
        ours.score,
        opponent.score,
        result,
        opponent.abbrev,
        home,
      ),
      dateLabel: formatDateLabel(gameDate),
      stats,
    },
    live: gameStatus?.live === true,
    final: gameStatus ? gameStatus.final : true,
  };
};

const parseSummaryPlayers = (
  payload: EspnSummaryPayload | null | undefined,
  eventId: string,
  gameDate: string,
  includeQuiet: boolean,
  gameStatus?: EspnGameStatus,
): NightStandout[] => {
  const rows: NightStandout[] = [];
  const headerComps = payload?.header?.competitions?.[0]?.competitors ?? [];
  for (const side of payload?.boxscore?.players ?? []) {
    const teamId =
      resolveTeamId(
        side.team?.abbreviation,
        side.team?.displayName,
        side.team?.id,
      ) ?? "";
    const ours = headerComps.find((item) => {
      const id = resolveTeamId(
        item.team?.abbreviation,
        item.team?.displayName,
        item.team?.id,
      );
      return Boolean(teamId) && id === teamId;
    });
    const opp = headerComps.find((item) => ours != null && item !== ours);
    if (!ours || !opp || !teamId) {
      continue;
    }
    const opponentId =
      resolveTeamId(
        opp?.team?.abbreviation,
        opp?.team?.displayName,
        opp?.team?.id,
      ) ?? "";
    const opponentAbbrev =
      opponentId || (opp?.team?.abbreviation ?? "OPP").toUpperCase();
    const group = side.statistics?.[0];
    const keys = group?.keys ?? group?.labels ?? [];
    for (const athlete of group?.athletes ?? []) {
      const id = String(athlete.athlete?.id ?? "");
      if (!getPlayer(id)) {
        continue;
      }
      const stats = statsFromBoxRow(keys, athlete.stats ?? []);
      const row = nightStandoutFromBox(
        id,
        athlete.athlete?.displayName ?? getPlayer(id)?.name ?? "",
        teamId,
        {
          id: opponentId,
          abbrev: opponentAbbrev,
          score: competitorScore(opp),
        },
        {
          score: competitorScore(ours),
          winner: ours?.winner,
          home:
            ours?.homeAway === "away"
              ? false
              : ours?.homeAway === "home"
                ? true
                : opp?.homeAway === "away",
        },
        eventId,
        gameDate,
        stats,
        includeQuiet,
        gameStatus,
      );
      if (row) {
        rows.push(row);
      }
    }
  }
  return rows;
};

export const parseSummaryStandouts = (
  payload: EspnSummaryPayload | null | undefined,
  eventId: string,
  gameDate: string,
  gameStatus?: EspnGameStatus,
): NightStandout[] =>
  parseSummaryPlayers(payload, eventId, gameDate, false, gameStatus);

/** Every minute-played box line — quiet 4-point nights stay in the sample. */
export const parseSummaryBoxAppearances = (
  payload: EspnSummaryPayload | null | undefined,
  eventId: string,
  gameDate: string,
  gameStatus?: EspnGameStatus,
): NightStandout[] =>
  parseSummaryPlayers(payload, eventId, gameDate, true, gameStatus);

const boxCache = new Map<string, NightStandout[]>();
const cache = new Map<string, NightStandout[]>();

export const fetchNightBoxAppearances = async (
  iso: string,
): Promise<NightStandout[]> => {
  const date = isoDateOnly(iso);
  if (!date) {
    return [];
  }
  return loadNightBoxAppearances(date);
};

const loadNightBoxAppearances = async (date: string): Promise<NightStandout[]> => {
  if (boxCache.has(date)) {
    return boxCache.get(date) ?? [];
  }
  try {
    const boardRes = await fetch(ESPN_SCOREBOARD_URL(date), {
      mode: "cors",
      credentials: "omit",
      signal: AbortSignal.timeout(12000),
    });
    if (!boardRes.ok) {
      return [];
    }
    const board = (await boardRes.json()) as EspnScoreboardPayload;
    const events = (board.events ?? []).filter(eventIsPlayed);
    const batches = await Promise.all(
      events.map(async (event) => {
        const eventId = String(event.id ?? "");
        if (!eventId) {
          return [] as NightStandout[];
        }
        const response = await fetch(ESPN_SUMMARY_URL(eventId), {
          mode: "cors",
          credentials: "omit",
          signal: AbortSignal.timeout(12000),
        });
        if (!response.ok) {
          return [] as NightStandout[];
        }
        const summary = (await response.json()) as EspnSummaryPayload;
        return parseSummaryBoxAppearances(
          summary,
          eventId,
          date,
          espnGameStatus(event),
        );
      }),
    );
    const rows = batches.flat();
    if (rows.length > 0) {
      boxCache.set(date, rows);
    }
    return rows;
  } catch {
    return [];
  }
};

export const fetchNightStandouts = async (
  iso: string,
): Promise<NightStandout[]> => {
  const date = isoDateOnly(iso);
  if (!date) {
    return [];
  }
  if (cache.has(date)) {
    return cache.get(date) ?? [];
  }
  const ranked = rankNightStandouts(await loadNightBoxAppearances(date));
  if (ranked.length > 0) {
    cache.set(date, ranked);
  }
  return ranked;
};

/** Keep each athlete's best night, then rank the week. */
export const mergeWeekStandouts = (nights: NightStandout[][]) => {
  const best = new Map<string, NightStandout>();
  for (const rows of nights) {
    for (const row of rows) {
      const previous = best.get(row.athleteId);
      if (!previous || row.score > previous.score) {
        best.set(row.athleteId, row);
      }
    }
  }
  return [...best.values()].sort((a, b) => b.score - a.score);
};

const addBoxStats = (left: LastGameStats, right: LastGameStats): LastGameStats => ({
  pts: String(n(left.pts) + n(right.pts)),
  reb: String(n(left.reb) + n(right.reb)),
  ast: String(n(left.ast) + n(right.ast)),
  stl: String(n(left.stl) + n(right.stl)),
  blk: String(n(left.blk) + n(right.blk)),
  tov: String(n(left.tov) + n(right.tov)),
  min: String(n(left.min) + n(right.min)),
  fg: addMadeAttempted(left.fg, right.fg),
  three: addMadeAttempted(left.three, right.three),
  ft: addMadeAttempted(left.ft, right.ft),
});

const averageBoxStats = (stats: LastGameStats, games: number): LastGameStats => {
  const gp = Math.max(1, games);
  const avg = (value: string) => String(Math.round((n(value) / gp) * 10) / 10);
  return {
    pts: avg(stats.pts),
    reb: avg(stats.reb),
    ast: avg(stats.ast),
    stl: avg(stats.stl),
    blk: avg(stats.blk),
    tov: avg(stats.tov),
    min: avg(stats.min),
    fg: averageMadeAttempted(stats.fg, gp),
    three: averageMadeAttempted(stats.three, gp),
    ft: averageMadeAttempted(stats.ft, gp),
  };
};

/** Per-game box line across every appearance — a 23-point night does not erase 0-point ones. */
export const mergeRangeProduction = (nights: NightStandout[][]) => {
  const totals = new Map<
    string,
    { row: NightStandout; stats: LastGameStats; games: number }
  >();
  for (const rows of nights) {
    for (const row of rows) {
      if (n(row.game.stats.min) <= 0) {
        continue;
      }
      const previous = totals.get(row.athleteId);
      if (!previous) {
        totals.set(row.athleteId, {
          row,
          stats: { ...row.game.stats },
          games: 1,
        });
        continue;
      }
      previous.stats = addBoxStats(previous.stats, row.game.stats);
      previous.games += 1;
      if (
        nightFlagsFor(row.game.stats).score >
        nightFlagsFor(previous.row.game.stats).score
      ) {
        previous.row = row;
      }
    }
  }
  return [...totals.values()]
    .map(({ row, stats, games }) => {
      const averaged = averageBoxStats(stats, games);
      const extra = nightFlagsFor(averaged);
      return {
        ...row,
        line: standoutLine(averaged, extra),
        score: extra.score,
        games,
        game: { ...row.game, stats: averaged },
      };
    })
    .sort((left, right) => right.score - left.score);
};

const fetchNightsInRange = async (
  fromIso: string,
  toIso: string,
  loadNight: (iso: string) => Promise<NightStandout[]>,
) => {
  const dates = datesInInclusiveRange(fromIso, toIso);
  if (!dates.length) {
    return [] as NightStandout[][];
  }
  const batches: NightStandout[][] = [];
  for (let index = 0; index < dates.length; index += 2) {
    const slice = dates.slice(index, index + 2);
    batches.push(...(await Promise.all(slice.map((date) => loadNight(date)))));
  }
  return batches;
};

export const fetchStandoutsInRange = async (
  fromIso: string,
  toIso: string,
): Promise<NightStandout[]> =>
  mergeWeekStandouts(await fetchNightsInRange(fromIso, toIso, fetchNightStandouts));

export const fetchRangeProduction = async (
  fromIso: string,
  toIso: string,
): Promise<NightStandout[]> =>
  mergeRangeProduction(
    await fetchNightsInRange(fromIso, toIso, loadNightBoxAppearances),
  );

export const DUD_CAMP_PPG = 5;
export const DUD_MIN_MINUTES = 18;
export const DUD_MIN_FGA = 8;
export const DUD_POOR_TS = 0.45;
export const DUD_POOR_EFG = 0.42;
export const DUD_TOV_HIGH = 6;
export const DUD_TOV_VOLUME = 5;
export const DUD_STAR_USUAL_PTS = 15;
export const DUD_LIMIT = 8;

export const isCampUsualLine = (athleteId: string) => {
  const player = getPlayer(athleteId);
  const usual = usualLineFor(athleteId).pts;
  return usual < DUD_CAMP_PPG && (player?.ppg ?? 0) < DUD_CAMP_PPG;
};

export const roughNightBadge = (stats: LastGameStats) => {
  const shooting = totwShooting(stats);
  const tov = Number.parseFloat(stats.tov);
  const turnovers = Number.isFinite(tov) ? tov : 0;
  const fgPct = shooting.fga > 0 ? shooting.fg.made / shooting.fga : 1;
  if (turnovers >= DUD_TOV_HIGH) {
    return "Turnovers";
  }
  if (shooting.fga >= DUD_MIN_FGA && fgPct < 0.4) {
    return "Bricks";
  }
  return "Stinker";
};

export const roughNightLine = (stats: LastGameStats) => {
  const bits: string[] = [];
  if (stats.fg && stats.fg !== "0-0") {
    bits.push(`${stats.fg} FG`);
  }
  const tov = Number.parseFloat(stats.tov);
  if (Number.isFinite(tov) && tov > 0) {
    bits.push(`${stats.tov} TO`);
  }
  bits.push(`${stats.pts} PTS`);
  return bits.join(" · ");
};

export const roughNightScore = (stats: LastGameStats, usual: UsualLine) => {
  const extra = nightFlagsFor(stats);
  const shooting = totwShooting(stats);
  const tov = Number.parseFloat(stats.tov);
  const turnovers = Number.isFinite(tov) ? tov : 0;
  const volume = Math.min(2, shooting.fga / TOTW_EFF_FGA_REF);
  const tsHole =
    shooting.ts != null && shooting.fga >= DUD_MIN_FGA
      ? Math.max(0, TOTW_TS_REF - shooting.ts) * 120 * volume
      : 0;
  const efgHole =
    shooting.efg != null && shooting.fga >= DUD_MIN_FGA
      ? Math.max(0, TOTW_EFG_REF - shooting.efg) * 90 * volume
      : 0;
  const tovPain = turnovers * 9 + (turnovers >= DUD_TOV_HIGH ? 18 : 0);
  const collapse =
    usual.pts >= DUD_STAR_USUAL_PTS
      ? Math.max(0, usual.pts - extra.pts) * 2.4 +
        Math.max(0, usual.pts + usual.reb + usual.ast - extra.pra) * 0.5
      : 0;
  return tsHole + efgHole + tovPain + collapse;
};

export const isHighTovNight = (stats: LastGameStats) => {
  const tov = Number.parseFloat(stats.tov);
  const turnovers = Number.isFinite(tov) ? tov : 0;
  const shooting = totwShooting(stats);
  return (
    turnovers >= DUD_TOV_HIGH ||
    (turnovers >= DUD_TOV_VOLUME && shooting.fga >= DUD_MIN_FGA)
  );
};

export const isRoughNight = (
  stats: LastGameStats,
  usual: UsualLine,
  athleteId: string,
) => {
  const min = n(stats.min);
  if (min <= 0) {
    return false;
  }
  const extra = nightFlagsFor(stats);
  const shooting = totwShooting(stats);
  const fgPct = shooting.fga > 0 ? shooting.fg.made / shooting.fga : 1;
  const brick =
    shooting.fga >= DUD_MIN_FGA &&
    ((shooting.ts != null && shooting.ts < DUD_POOR_TS) ||
      (shooting.efg != null && shooting.efg < DUD_POOR_EFG) ||
      (shooting.fga >= 10 && fgPct < 0.36));
  const tovNight = isHighTovNight(stats);
  const collapse =
    usual.pts >= DUD_STAR_USUAL_PTS &&
    extra.pts <= Math.max(8, usual.pts * 0.4) &&
    min >= 20;
  /** 6+ TO (or 5 TO on real FGA) is the story — even a rookie / short night. */
  if (tovNight) {
    return true;
  }
  if (isCampUsualLine(athleteId) || min < DUD_MIN_MINUTES) {
    return false;
  }
  return brick || collapse;
};

export const asNightDud = (row: NightStandout): NightStandout | null => {
  if (!isCompletedNightRow(row) || n(row.game.stats.min) <= 0) {
    return null;
  }
  const usual = usualLineFor(row.athleteId);
  if (!isRoughNight(row.game.stats, usual, row.athleteId)) {
    return null;
  }
  const badge = roughNightBadge(row.game.stats);
  return {
    ...row,
    badge,
    flags: [badge],
    line: roughNightLine(row.game.stats),
    score: roughNightScore(row.game.stats, usual),
  };
};

/** Worst completed nights — bricks / turnovers / star stinkers, not camp 2-point DNPs. */
export const rankNightDuds = (
  rows: NightStandout[],
  excludeIds?: Iterable<string>,
) => {
  const skip = new Set(excludeIds);
  const seen = new Set<string>();
  const duds: NightStandout[] = [];
  for (const row of rows) {
    if (seen.has(row.athleteId) || skip.has(row.athleteId)) {
      continue;
    }
    const dud = asNightDud(row);
    if (!dud) {
      continue;
    }
    seen.add(row.athleteId);
    duds.push(dud);
  }
  return duds.sort((left, right) => right.score - left.score).slice(0, DUD_LIMIT);
};

export const mergeWeekDuds = (nights: NightStandout[][]) => {
  const worst = new Map<string, NightStandout>();
  for (const rows of nights) {
    for (const row of rows) {
      const dud = asNightDud(row);
      if (!dud) {
        continue;
      }
      const previous = worst.get(dud.athleteId);
      if (!previous || dud.score > previous.score) {
        worst.set(dud.athleteId, dud);
      }
    }
  }
  return [...worst.values()]
    .sort((left, right) => right.score - left.score)
    .slice(0, DUD_LIMIT);
};

export const fetchDudsInRange = async (
  fromIso: string,
  toIso: string,
): Promise<NightStandout[]> =>
  mergeWeekDuds(
    await fetchNightsInRange(fromIso, toIso, loadNightBoxAppearances),
  );

export const fetchWeekStandouts = async (
  endIso: string,
  nights = 7,
): Promise<NightStandout[]> => {
  const end = isoDateOnly(endIso);
  if (!end || nights < 1) {
    return [];
  }
  const from = shiftIsoDate(end, -(nights - 1));
  return fetchStandoutsInRange(from, end);
};
