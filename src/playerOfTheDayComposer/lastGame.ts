import type { ComposerStatsSample } from "../instagramComposer/composerStatsSample";
import { everyTeamCurrentSeason } from "../everyTeamComposer/historicalRosters";
import { NBA_TEAMS, NBA_TEAMS_BY_ID } from "../standingsComposer/teams";

/** ESPN `season` query is the ending year: 2026-27 → 2027. */
export const espnGamelogSeasonYear = (season = everyTeamCurrentSeason()) => {
  const start = Number.parseInt(season.slice(0, 4), 10);
  return Number.isFinite(start) ? start + 1 : 2027;
};

export const ESPN_GAMELOG_URL = (
  athleteId: string,
  seasonYear = espnGamelogSeasonYear(),
) =>
  `https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/${encodeURIComponent(athleteId)}/gamelog?season=${seasonYear}`;

/** ESPN box-score abbreviations that are not our 3-letter club ids. */
export const ESPN_ABBREV_TO_TEAM: Record<string, string> = {
  NY: "NYK",
  NYK: "NYK",
  GS: "GSW",
  GSW: "GSW",
  SA: "SAS",
  SAS: "SAS",
  NO: "NOP",
  NOP: "NOP",
  WSH: "WAS",
  WAS: "WAS",
  PHO: "PHX",
  PHX: "PHX",
  UTH: "UTA",
  UTAH: "UTA",
  UTA: "UTA",
  BK: "BKN",
  BRK: "BKN",
  BKN: "BKN",
  CHA: "CHA",
  CHO: "CHA",
};

export interface LastGameStats {
  pts: string;
  reb: string;
  ast: string;
  stl: string;
  blk: string;
  fg: string;
  three: string;
  tov: string;
  min: string;
  ft?: string;
}

export interface LastGame {
  eventId: string;
  gameDate: string;
  teamId: string;
  opponentId: string;
  opponentAbbrev: string;
  result: "W" | "L" | string;
  playerScore: string;
  opponentScore: string;
  /** True when the player's team is at home. */
  home?: boolean;
  resultLine: string;
  dateLabel: string;
  stats: LastGameStats;
}

export const emptyStats = (): LastGameStats => ({
  pts: "0",
  reb: "0",
  ast: "0",
  stl: "0",
  blk: "0",
  fg: "0-0",
  three: "0-0",
  tov: "0",
  min: "0",
  ft: "0-0",
});

export const isoDateOnly = (value: string | null | undefined) => {
  const raw = String(value ?? "").trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  const compact = raw.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compact) {
    return `${compact[1]}-${compact[2]}-${compact[3]}`;
  }
  return "";
};

export const toEspnDateParam = (iso: string) =>
  isoDateOnly(iso).replace(/-/g, "");

/** NBA slate dates follow the US East calendar, not the browser's UTC day. */
export const nbaTodayIso = (now = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

/**
 * Tip-off timestamps map onto the ET calendar (8pm ET Friday is Saturday 00:00Z).
 * Bare YYYY-MM-DD / YYYYMMDD tokens are already slate dates — don't shift those.
 */
export const nbaSlateDate = (value: string | null | undefined) => {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return "";
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw) || /^\d{8}$/.test(raw)) {
    return isoDateOnly(raw);
  }
  const parsed = Date.parse(raw);
  if (Number.isFinite(parsed)) {
    return nbaTodayIso(new Date(parsed));
  }
  return isoDateOnly(raw);
};

/** NBA season year runs July 1 → June 30. Drops leftover ESPN gamelogs. */
export const seasonDateWindow = (season: string) => {
  const start = Number.parseInt(season.slice(0, 4), 10);
  if (!Number.isFinite(start)) {
    return { from: "2000-07-01", to: "2100-06-30" };
  }
  return { from: `${start}-07-01`, to: `${start + 1}-06-30` };
};

export const gameInSeasonWindow = (gameDate: string, season: string) => {
  const day = nbaSlateDate(gameDate);
  if (!day) {
    return false;
  }
  const { from, to } = seasonDateWindow(season);
  return day >= from && day <= to;
};

export const shiftIsoDate = (iso: string, days: number) => {
  const token = isoDateOnly(iso) || nbaTodayIso();
  const [year, month, day] = token.split("-").map(Number);
  const next = new Date(Date.UTC(year, (month ?? 1) - 1, (day ?? 1) + days));
  return next.toISOString().slice(0, 10);
};

/** First integer in an ESPN score field (`132`, `{ displayValue | value: 132 }`). */
export const scorePoints = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (value && typeof value === "object") {
    const row = value as { displayValue?: unknown; value?: unknown };
    if (row.displayValue != null && row.displayValue !== "") {
      return scorePoints(row.displayValue);
    }
    if (row.value != null && row.value !== "") {
      return scorePoints(row.value);
    }
  }
  const match = String(value ?? "").match(/(\d+)/);
  if (!match) {
    return null;
  }
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
};

export const competitorScore = (
  item?: { score?: unknown } | null,
): string => {
  if (!item) {
    return "";
  }
  const points = scorePoints(item.score);
  if (points != null) {
    return String(points);
  }
  return typeof item.score === "string" ? item.score : "";
};

/**
 * W/L token from a result string. Exact `W`/`L` only — `ORL` must not count as a loss.
 */
export const wlToken = (result: unknown): "W" | "L" | "" => {
  const token = String(result ?? "")
    .trim()
    .toUpperCase();
  if (token === "W" || token === "L") {
    return token;
  }
  const found = token.split(/\s+/).find((part) => part === "W" || part === "L");
  return found === "W" || found === "L" ? found : "";
};

/**
 * Final W/L for the player's club. Prefer the two team scores so a missing or
 * opponent-side `winner` flag cannot mark a win as L.
 */
export const playerGameResult = (
  playerScore: unknown,
  opponentScore: unknown,
  fallback?: unknown,
): "W" | "L" | "" => {
  const ours = scorePoints(playerScore);
  const theirs = scorePoints(opponentScore);
  if (ours != null && theirs != null && ours !== theirs) {
    return ours > theirs ? "W" : "L";
  }
  if (fallback === true) {
    return "W";
  }
  if (fallback === false) {
    return "L";
  }
  return wlToken(fallback);
};

/** Same NBA club — ESPN numeric id, abbrev, or our 3-letter id. */
export const sameNbaClub = (left: unknown, right: unknown) => {
  const key = (value: unknown) => {
    if (value == null || String(value).trim() === "") {
      return "";
    }
    const token = String(value);
    return (
      resolveTeamId(token, null, token) ||
      resolveTeamId(null, null, token) ||
      token.trim().toUpperCase()
    );
  };
  const a = key(left);
  const b = key(right);
  return Boolean(a && b && a === b);
};

/**
 * Player's club is home when its id matches `homeTeamId`.
 * Do not trust `atVs` first — ESPN sometimes says `vs` on an away night.
 */
export const playerIsHomeSide = (
  atVs?: string | null,
  homeTeamId?: string | number | null,
  teamId?: string | number | null,
  awayTeamId?: string | number | null,
) => {
  if (teamId != null && String(teamId) !== "") {
    if (homeTeamId != null && sameNbaClub(homeTeamId, teamId)) {
      return true;
    }
    if (awayTeamId != null && sameNbaClub(awayTeamId, teamId)) {
      return false;
    }
    if (homeTeamId != null) {
      return false;
    }
  }
  const token = String(atVs ?? "")
    .trim()
    .toLowerCase();
  if (token === "@" || token === "at") {
    return false;
  }
  if (token === "vs" || token === "v") {
    return true;
  }
  return true;
};

/** Player-club score vs opponent score. Venue from IDs, not ESPN winner/`atVs`. */
export const playerClubScores = (input: {
  teamId?: string | number | null;
  atVs?: string | null;
  homeTeamId?: string | number | null;
  awayTeamId?: string | number | null;
  homeTeamScore?: unknown;
  awayTeamScore?: unknown;
  fallbackResult?: unknown;
}) => {
  const home = playerIsHomeSide(
    input.atVs,
    input.homeTeamId,
    input.teamId,
    input.awayTeamId,
  );
  const homeScore = competitorScore({ score: input.homeTeamScore });
  const awayScore = competitorScore({ score: input.awayTeamScore });
  const playerScore = home ? homeScore : awayScore;
  const opponentScore = home ? awayScore : homeScore;
  return {
    home,
    playerScore,
    opponentScore,
    result: playerGameResult(playerScore, opponentScore, input.fallbackResult),
  };
};

export const formatDateLabel = (iso: string) => {
  const match = nbaSlateDate(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    return iso;
  }
  return `${Number(match[2])}/${Number(match[3])}`;
};

export const todayDateLabel = (now = new Date()) => {
  const token = nbaTodayIso(now);
  const [, month, day] = token.split("-");
  return `${Number(month)}/${Number(day)}`;
};

const addMakes = (left: string, right: string) => {
  const [lm, la] = String(left).split("-").map((part) => Number(part) || 0);
  const [rm, ra] = String(right).split("-").map((part) => Number(part) || 0);
  return `${lm + rm}-${la + ra}`;
};

const sumStat = (games: LastGame[], key: keyof LastGameStats) =>
  games.reduce((total, game) => total + (Number(game.stats[key]) || 0), 0);

export const gamesInInclusiveRange = (
  games: LastGame[],
  from: string,
  to: string,
) => {
  const start = nbaSlateDate(from) || isoDateOnly(from);
  const end = nbaSlateDate(to) || isoDateOnly(to);
  if (!start || !end) {
    return games;
  }
  const lo = start <= end ? start : end;
  const hi = start <= end ? end : start;
  return games.filter((game) => {
    const date = nbaSlateDate(game.gameDate) || isoDateOnly(game.gameDate);
    return Boolean(date && date >= lo && date <= hi);
  });
};

/** Sum box-score counting stats across a week-in-review window. */
export const aggregateLastGames = (games: LastGame[]): LastGame | null => {
  if (!games.length) {
    return null;
  }
  if (games.length === 1) {
    return games[0] ?? null;
  }
  const first = games[games.length - 1]!;
  const last = games[0]!;
  const stats: LastGameStats = {
    pts: String(sumStat(games, "pts")),
    reb: String(sumStat(games, "reb")),
    ast: String(sumStat(games, "ast")),
    stl: String(sumStat(games, "stl")),
    blk: String(sumStat(games, "blk")),
    tov: String(sumStat(games, "tov")),
    min: String(sumStat(games, "min")),
    fg: games.reduce((total, game) => addMakes(total, game.stats.fg), "0-0"),
    three: games.reduce(
      (total, game) => addMakes(total, game.stats.three),
      "0-0",
    ),
    ft: games.reduce(
      (total, game) => addMakes(total, game.stats.ft ?? "0-0"),
      "0-0",
    ),
  };
  return {
    ...last,
    eventId: games.map((game) => game.eventId).filter(Boolean).join(","),
    gameDate: last.gameDate,
    resultLine: `${games.length} GP`,
    dateLabel: `${games.length} GP`,
    stats,
    opponentAbbrev: first.opponentAbbrev,
  };
};

export const averageLastGames = (games: LastGame[], count = 5): LastGame | null => {
  const slice = games.slice(0, Math.max(1, count));
  const summed = aggregateLastGames(slice);
  if (!summed || slice.length <= 1) {
    return summed;
  }
  const n = slice.length;
  const avg = (value: string) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return value;
    }
    const mean = parsed / n;
    return Number.isInteger(mean) ? String(mean) : mean.toFixed(1);
  };
  const avgMakes = (value: string) => {
    const [made, attempted] = value.split("-").map((part) => Number(part) || 0);
    const meanMade = made / n;
    const meanAtt = attempted / n;
    const fmt = (part: number) =>
      Number.isInteger(part) ? String(part) : part.toFixed(1);
    return `${fmt(meanMade)}-${fmt(meanAtt)}`;
  };
  return {
    ...summed,
    resultLine: `LAST ${n}`,
    dateLabel: `LAST ${n}`,
    stats: {
      pts: avg(summed.stats.pts),
      reb: avg(summed.stats.reb),
      ast: avg(summed.stats.ast),
      stl: avg(summed.stats.stl),
      blk: avg(summed.stats.blk),
      tov: avg(summed.stats.tov),
      min: avg(summed.stats.min),
      fg: avgMakes(summed.stats.fg),
      three: avgMakes(summed.stats.three),
      ft: avgMakes(summed.stats.ft ?? "0-0"),
    },
  };
};

export const gameOnDate = (games: LastGame[], iso: string) => {
  const want = nbaSlateDate(iso) || isoDateOnly(iso);
  if (!want) {
    return games[0] ?? null;
  }
  return (
    games.find((game) => nbaSlateDate(game.gameDate) === want) ?? null
  );
};

/** Exact slate first, then the most recent completed game on or before that date. */
export const gameOnOrBeforeDate = (
  games: LastGame[],
  iso?: string | null,
) => {
  const want = nbaSlateDate(iso ?? "") || isoDateOnly(iso ?? "");
  if (!want) {
    return games[0] ?? null;
  }
  return (
    games.find((game) => nbaSlateDate(game.gameDate) === want) ??
    games.find((game) => {
      const date = nbaSlateDate(game.gameDate);
      return Boolean(date && date <= want);
    }) ??
    null
  );
};

export const resolveTeamId = (
  abbreviation?: string | null,
  displayName?: string | null,
  espnNumericId?: string | number | null,
): string | null => {
  const name = displayName?.trim();
  if (name) {
    const byName = NBA_TEAMS.find(
      (team) => team.name.toLowerCase() === name.toLowerCase(),
    );
    if (byName) {
      return byName.id;
    }
  }
  const token = (abbreviation ?? "").trim().toUpperCase();
  if (token) {
    const mapped = ESPN_ABBREV_TO_TEAM[token] ?? token;
    if (NBA_TEAMS_BY_ID[mapped]) {
      return mapped;
    }
  }
  if (espnNumericId != null && String(espnNumericId) !== "") {
    const hit = Object.entries(ESPN_TEAM_IDS).find(
      ([, id]) => String(id) === String(espnNumericId),
    );
    if (hit) {
      return hit[0];
    }
  }
  return null;
};

const STAT_KEYS = {
  MIN: "min",
  FG: "fg",
  "3PT": "three",
  FT: "ft",
  REB: "reb",
  AST: "ast",
  BLK: "blk",
  STL: "stl",
  TO: "tov",
  PTS: "pts",
} as const;

const readStats = (labels: string[], values: string[]): LastGameStats => {
  const stats = emptyStats();
  labels.forEach((label, index) => {
    const key = STAT_KEYS[label as keyof typeof STAT_KEYS];
    const value = values[index];
    if (key && value) {
      stats[key] = value;
    }
  });
  return stats;
};

interface EspnEvent {
  id?: string;
  gameDate?: string;
  score?: string;
  /** `@` away, `vs` home — athlete-relative, unlike homeTeamId. */
  atVs?: string;
  homeTeamId?: string | number;
  awayTeamId?: string | number;
  homeTeamScore?: string | number;
  awayTeamScore?: string | number;
  gameResult?: string;
  opponent?: { abbreviation?: string; displayName?: string };
  team?: { id?: string | number; abbreviation?: string; displayName?: string };
}

interface EspnCategory {
  events?: Array<{ eventId?: string; stats?: string[] }>;
}

interface EspnSeasonType {
  displayName?: string;
  categories?: EspnCategory[];
}

export interface EspnGamelogPayload {
  labels?: string[];
  events?: Record<string, EspnEvent>;
  seasonTypes?: EspnSeasonType[];
}

const isPreseason = (label: string) => /preseason/i.test(label);

const seasonTypeMatchesYear = (label: string, season: string) => {
  if (!/\d{4}\s*[-–]\s*\d{2}/.test(label)) {
    return true;
  }
  return label.replace(/\s/g, "").includes(season);
};

const eventIdsForSeason = (season: EspnSeasonType) => {
  const ids: string[] = [];
  for (const category of season.categories ?? []) {
    for (const item of category.events ?? []) {
      if (item.eventId) {
        ids.push(item.eventId);
      }
    }
  }
  return ids;
};

const walkEventsSplit = (payload: EspnGamelogPayload, season: string) => {
  const preseason: string[] = [];
  const regular: string[] = [];
  for (const type of payload.seasonTypes ?? []) {
    const label = type.displayName ?? "";
    if (!seasonTypeMatchesYear(label, season)) {
      continue;
    }
    const ids = eventIdsForSeason(type);
    if (isPreseason(label)) {
      preseason.push(...ids);
    } else {
      regular.push(...ids);
    }
  }
  return { preseason, regular };
};

export const formatResultLine = (
  playerScore: string,
  opponentScore: string,
  result: string,
  opponentAbbrev: string,
  home = true,
) => {
  const venue = home === false ? "@" : "VS";
  return `${playerScore}-${opponentScore} ${result} ${venue} ${opponentAbbrev}`
    .replace(/\s+/g, " ")
    .trim();
};

const statsForEvent = (payload: EspnGamelogPayload, eventId: string) => {
  for (const season of payload.seasonTypes ?? []) {
    for (const category of season.categories ?? []) {
      const hit = category.events?.find((item) => item.eventId === eventId);
      if (hit?.stats) {
        return hit.stats;
      }
    }
  }
  return [] as string[];
};

export const gameFromEvent = (
  payload: EspnGamelogPayload,
  eventId: string,
): LastGame | null => {
  const event = payload.events?.[eventId];
  if (!event) {
    return null;
  }
  const labels = payload.labels ?? [];
  const rawStats = statsForEvent(payload, eventId);
  const teamId =
    resolveTeamId(event.team?.abbreviation, event.team?.displayName) ?? "";
  const opponentId =
    resolveTeamId(event.opponent?.abbreviation, event.opponent?.displayName) ??
    "";
  const opponentAbbrev =
    opponentId ||
    (event.opponent?.abbreviation ?? "").toUpperCase() ||
    "OPP";
  const box = playerClubScores({
    teamId: event.team?.id ?? teamId,
    atVs: event.atVs,
    homeTeamId: event.homeTeamId,
    awayTeamId: event.awayTeamId,
    homeTeamScore: event.homeTeamScore,
    awayTeamScore: event.awayTeamScore,
    fallbackResult: event.gameResult,
  });
  const playerIsHome = box.home;
  const playerScore = box.playerScore;
  const opponentScore = box.opponentScore;
  const result = box.result || "—";
  const gameDate = event.gameDate ?? "";

  return {
    eventId,
    gameDate,
    teamId,
    opponentId,
    opponentAbbrev,
    result,
    playerScore,
    opponentScore,
    home: playerIsHome,
    resultLine: formatResultLine(
      playerScore,
      opponentScore,
      result,
      opponentAbbrev,
      playerIsHome,
    ),
    dateLabel: formatDateLabel(gameDate),
    stats: readStats(labels, rawStats),
  };
};

export const parseGamelogGames = (
  payload: EspnGamelogPayload | null | undefined,
  sample: ComposerStatsSample = "preseason",
  season = everyTeamCurrentSeason(),
): LastGame[] => {
  if (!payload || typeof payload !== "object") {
    return [];
  }
  const split = walkEventsSplit(payload, season);
  const preferred = sample === "preseason" ? split.preseason : split.regular;
  const ordered =
    preferred.length > 0
      ? preferred
      : sample === "regular"
        ? split.preseason
        : [];
  const games: LastGame[] = [];
  const seen = new Set<string>();
  for (const eventId of ordered) {
    if (seen.has(eventId)) {
      continue;
    }
    seen.add(eventId);
    const game = gameFromEvent(payload, eventId);
    if (game && gameInSeasonWindow(game.gameDate, season)) {
      games.push(game);
    }
  }
  games.sort((left, right) =>
    nbaSlateDate(right.gameDate).localeCompare(nbaSlateDate(left.gameDate)) ||
    right.gameDate.localeCompare(left.gameDate),
  );
  return games;
};

export const parseLastGamePayload = (
  payload: EspnGamelogPayload | null | undefined,
  sample: ComposerStatsSample = "preseason",
  season = everyTeamCurrentSeason(),
): LastGame | null => parseGamelogGames(payload, sample, season)[0] ?? null;

const cache = new Map<string, LastGame[]>();

const cacheKey = (
  athleteId: string,
  sample: ComposerStatsSample,
  seasonYear: number,
) => `${athleteId}::${sample}::${seasonYear}`;

export const fetchRecentGames = async (
  athleteId: string,
  sample: ComposerStatsSample = "preseason",
  season = everyTeamCurrentSeason(),
): Promise<LastGame[]> => {
  const id = athleteId.trim();
  if (!id) {
    return [];
  }
  const seasonYear = espnGamelogSeasonYear(season);
  const key = cacheKey(id, sample, seasonYear);
  if (cache.has(key)) {
    return cache.get(key) ?? [];
  }
  try {
    const response = await fetch(ESPN_GAMELOG_URL(id, seasonYear), {
      mode: "cors",
      credentials: "omit",
    });
    if (!response.ok) {
      return [];
    }
    const payload = (await response.json()) as EspnGamelogPayload;
    const games = parseGamelogGames(payload, sample, season);
    cache.set(key, games);
    return games;
  } catch {
    return [];
  }
};

export const fetchLastGame = async (
  athleteId: string,
  sample: ComposerStatsSample = "preseason",
  onDate?: string | null,
): Promise<LastGame | null> => {
  const games = await fetchRecentGames(athleteId, sample);
  return gameOnOrBeforeDate(games, onDate);
};

/** ESPN numeric club ids for schedule fetches. */
export const ESPN_TEAM_IDS: Record<string, number> = {
  ATL: 1,
  BOS: 2,
  NOP: 3,
  CHI: 4,
  CLE: 5,
  DAL: 6,
  DEN: 7,
  DET: 8,
  GSW: 9,
  HOU: 10,
  IND: 11,
  LAC: 12,
  LAL: 13,
  MIA: 14,
  MIL: 15,
  MIN: 16,
  BKN: 17,
  NYK: 18,
  ORL: 19,
  PHI: 20,
  PHX: 21,
  POR: 22,
  SAC: 23,
  SAS: 24,
  OKC: 25,
  UTA: 26,
  WAS: 27,
  TOR: 28,
  MEM: 29,
  CHA: 30,
};

export const ESPN_TEAM_SCHEDULE_URL = (
  espnTeamId: number,
  seasonYear = espnGamelogSeasonYear(),
  seasonType = 1,
) =>
  `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${espnTeamId}/schedule?season=${seasonYear}&seasontype=${seasonType}`;

export interface TeamLastNight {
  game: LastGame | null;
  record: { wins: number; losses: number } | null;
}

interface EspnScheduleCompetitor {
  homeAway?: string;
  score?: { displayValue?: string; value?: number } | string;
  winner?: boolean;
  team?: { abbreviation?: string; displayName?: string; id?: string };
}

interface EspnScheduleEvent {
  id?: string;
  date?: string;
  competitions?: Array<{
    competitors?: EspnScheduleCompetitor[];
    status?: { type?: { completed?: boolean } };
  }>;
}

export interface EspnTeamSchedulePayload {
  events?: EspnScheduleEvent[];
}

export const parseTeamScheduleLastNight = (
  payload: EspnTeamSchedulePayload | null | undefined,
  teamId: string,
  onDate?: string | null,
): TeamLastNight => {
  const events = [...(payload?.events ?? [])].sort((left, right) =>
    String(right.date ?? "").localeCompare(String(left.date ?? "")),
  );
  const completed: LastGame[] = [];
  for (const event of events.slice().reverse()) {
    const competition = event.competitions?.[0];
    if (!competition?.status?.type?.completed) {
      continue;
    }
    const ours = competition.competitors?.find((item) => {
      const id = resolveTeamId(
        item.team?.abbreviation,
        item.team?.displayName,
        item.team?.id,
      );
      return id === teamId || sameNbaClub(item.team?.id, teamId);
    });
    const opp = competition.competitors?.find((item) => item !== ours);
    if (!ours || !opp) {
      continue;
    }
    const opponentId =
      resolveTeamId(
        opp.team?.abbreviation,
        opp.team?.displayName,
        opp.team?.id,
      ) ?? "";
    const playerScore = competitorScore(ours);
    const opponentScore = competitorScore(opp);
    const result = playerGameResult(playerScore, opponentScore, ours.winner);
    const gameDate = event.date ?? "";
    const home =
      ours.homeAway === "away"
        ? false
        : ours.homeAway === "home"
          ? true
          : opp.homeAway === "away";
    completed.push({
      eventId: String(event.id ?? ""),
      gameDate,
      teamId,
      opponentId,
      opponentAbbrev: opponentId || (opp.team?.abbreviation ?? "OPP").toUpperCase(),
      result,
      playerScore,
      opponentScore,
      home,
      resultLine: formatResultLine(
        playerScore,
        opponentScore,
        result,
        opponentId || (opp.team?.abbreviation ?? "OPP").toUpperCase(),
        home,
      ),
      dateLabel: formatDateLabel(gameDate),
      stats: emptyStats(),
    });
  }
  const want = nbaSlateDate(onDate ?? "") || isoDateOnly(onDate ?? "");
  const eligible = want
    ? completed.filter((item) => {
        const date = nbaSlateDate(item.gameDate);
        return Boolean(date && date <= want);
      })
    : completed;
  const newestFirst = [...eligible].reverse();
  const game = want
    ? gameOnOrBeforeDate(newestFirst, want)
    : (newestFirst[0] ?? null);
  const wins = eligible.filter((item) => item.result === "W").length;
  const losses = eligible.filter((item) => item.result === "L").length;
  return {
    game,
    record: eligible.length ? { wins, losses } : null,
  };
};

const teamCache = new Map<string, TeamLastNight>();

export const fetchTeamLastNight = async (
  teamId: string,
  sample: ComposerStatsSample = "preseason",
  onDate?: string | null,
): Promise<TeamLastNight> => {
  const id = teamId.trim().toUpperCase();
  const espnId = ESPN_TEAM_IDS[id];
  if (!espnId) {
    return { game: null, record: null };
  }
  const seasonYear = espnGamelogSeasonYear();
  const seasonType = sample === "regular" ? 2 : 1;
  const slate = isoDateOnly(onDate ?? "");
  const key = `${id}::${sample}::${seasonYear}::${slate}`;
  if (teamCache.has(key)) {
    return teamCache.get(key)!;
  }
  try {
    const response = await fetch(
      ESPN_TEAM_SCHEDULE_URL(espnId, seasonYear, seasonType),
      {
        mode: "cors",
        credentials: "omit",
      },
    );
    if (!response.ok) {
      return { game: null, record: null };
    }
    const payload = (await response.json()) as EspnTeamSchedulePayload;
    const night = parseTeamScheduleLastNight(payload, id, slate || null);
    teamCache.set(key, night);
    return night;
  } catch {
    return { game: null, record: null };
  }
};
