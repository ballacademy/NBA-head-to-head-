import {
  everyTeamCurrentSeason,
  playerRowForSeason,
} from "../everyTeamComposer/historicalRosters";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import { datesInInclusiveRange } from "../instagramComposer/composerDateRange";
import {
  emptyStats,
  formatDateLabel,
  formatResultLine,
  isoDateOnly,
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
}

interface EspnCompetitor {
  score?: string | { displayValue?: string };
  winner?: boolean;
  homeAway?: string;
  team?: { abbreviation?: string; displayName?: string; id?: string };
}

interface EspnScoreboardEvent {
  id?: string;
  date?: string;
  status?: { type?: { completed?: boolean; state?: string; description?: string } };
  competitions?: Array<{
    competitors?: EspnCompetitor[];
    status?: { type?: { completed?: boolean; state?: string } };
  }>;
}

export interface EspnScoreboardPayload {
  events?: EspnScoreboardEvent[];
}

interface EspnBoxAthlete {
  athlete?: { id?: string; displayName?: string };
  stats?: string[];
}

interface EspnBoxTeam {
  team?: { abbreviation?: string; displayName?: string };
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

const competitorScore = (item: EspnCompetitor | undefined) => {
  if (!item) {
    return "";
  }
  if (typeof item.score === "string") {
    return item.score;
  }
  return String(item.score?.displayValue ?? "");
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
  const result = ours.winner ? "W" : "L";
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
      home: ours.home !== false,
      resultLine: formatResultLine(
        ours.score,
        opponent.score,
        result,
        opponent.abbrev,
      ),
      dateLabel: formatDateLabel(gameDate),
      stats,
    },
  };
};

const parseSummaryPlayers = (
  payload: EspnSummaryPayload | null | undefined,
  eventId: string,
  gameDate: string,
  includeQuiet: boolean,
): NightStandout[] => {
  const rows: NightStandout[] = [];
  const headerComps = payload?.header?.competitions?.[0]?.competitors ?? [];
  for (const side of payload?.boxscore?.players ?? []) {
    const teamId =
      resolveTeamId(side.team?.abbreviation, side.team?.displayName) ?? "";
    const ours = headerComps.find((item) => {
      const id = resolveTeamId(item.team?.abbreviation, item.team?.displayName);
      return id === teamId;
    });
    const opp = headerComps.find((item) => item !== ours);
    const opponentId =
      resolveTeamId(opp?.team?.abbreviation, opp?.team?.displayName) ?? "";
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
          home: ours?.homeAway !== "away",
        },
        eventId,
        gameDate,
        stats,
        includeQuiet,
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
): NightStandout[] => parseSummaryPlayers(payload, eventId, gameDate, false);

/** Every minute-played box line — quiet 4-point nights stay in the sample. */
export const parseSummaryBoxAppearances = (
  payload: EspnSummaryPayload | null | undefined,
  eventId: string,
  gameDate: string,
): NightStandout[] => parseSummaryPlayers(payload, eventId, gameDate, true);

const boxCache = new Map<string, NightStandout[]>();
const cache = new Map<string, NightStandout[]>();

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
        return parseSummaryBoxAppearances(summary, eventId, date);
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
  const avg = (value: string) => String(n(value) / gp);
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
