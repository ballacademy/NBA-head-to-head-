import type { ComposerStatsSample } from "../instagramComposer/composerStatsSample";
import { NBA_TEAMS, NBA_TEAMS_BY_ID } from "../standingsComposer/teams";

export const ESPN_GAMELOG_URL = (athleteId: string) =>
  `https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/${encodeURIComponent(athleteId)}/gamelog`;

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
});

export const formatDateLabel = (iso: string) => {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    return iso;
  }
  return `${Number(match[2])}/${Number(match[3])}`;
};

export const todayDateLabel = (now = new Date()) =>
  `${now.getMonth() + 1}/${now.getDate()}`;

export const resolveTeamId = (
  abbreviation?: string | null,
  displayName?: string | null,
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
  if (!token) {
    return null;
  }
  const mapped = ESPN_ABBREV_TO_TEAM[token] ?? token;
  return NBA_TEAMS_BY_ID[mapped] ? mapped : null;
};

const STAT_KEYS = {
  MIN: "min",
  FG: "fg",
  "3PT": "three",
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

const walkEventsSplit = (payload: EspnGamelogPayload) => {
  const preseason: string[] = [];
  const regular: string[] = [];
  for (const season of payload.seasonTypes ?? []) {
    const ids = eventIdsForSeason(season);
    if (isPreseason(season.displayName ?? "")) {
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
) =>
  `${playerScore}-${opponentScore} ${result} VS ${opponentAbbrev}`.replace(
    /\s+/g,
    " ",
  ).trim();

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
  const playerIsHome =
    String(event.homeTeamId ?? "") === String(event.team?.id ?? "");
  const playerScore = String(
    playerIsHome ? (event.homeTeamScore ?? "") : (event.awayTeamScore ?? ""),
  );
  const opponentScore = String(
    playerIsHome ? (event.awayTeamScore ?? "") : (event.homeTeamScore ?? ""),
  );
  const result = String(event.gameResult ?? "").toUpperCase() || "—";
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
    resultLine: formatResultLine(
      playerScore,
      opponentScore,
      result,
      opponentAbbrev,
    ),
    dateLabel: formatDateLabel(gameDate),
    stats: readStats(labels, rawStats),
  };
};

export const parseGamelogGames = (
  payload: EspnGamelogPayload | null | undefined,
  sample: ComposerStatsSample = "preseason",
): LastGame[] => {
  if (!payload || typeof payload !== "object") {
    return [];
  }
  const split = walkEventsSplit(payload);
  const preferred = sample === "preseason" ? split.preseason : split.regular;
  const fallback = sample === "preseason" ? split.regular : split.preseason;
  const ordered = preferred.length ? preferred : fallback;
  const games: LastGame[] = [];
  const seen = new Set<string>();
  for (const eventId of ordered) {
    if (seen.has(eventId)) {
      continue;
    }
    seen.add(eventId);
    const game = gameFromEvent(payload, eventId);
    if (game) {
      games.push(game);
    }
  }
  return games;
};

export const parseLastGamePayload = (
  payload: EspnGamelogPayload | null | undefined,
  sample: ComposerStatsSample = "preseason",
): LastGame | null => parseGamelogGames(payload, sample)[0] ?? null;

const cache = new Map<string, LastGame[]>();

const cacheKey = (athleteId: string, sample: ComposerStatsSample) =>
  `${athleteId}::${sample}`;

export const fetchRecentGames = async (
  athleteId: string,
  sample: ComposerStatsSample = "preseason",
): Promise<LastGame[]> => {
  const id = athleteId.trim();
  if (!id) {
    return [];
  }
  const key = cacheKey(id, sample);
  if (cache.has(key)) {
    return cache.get(key) ?? [];
  }
  try {
    const response = await fetch(ESPN_GAMELOG_URL(id), {
      mode: "cors",
      credentials: "omit",
    });
    if (!response.ok) {
      return [];
    }
    const payload = (await response.json()) as EspnGamelogPayload;
    const games = parseGamelogGames(payload, sample);
    cache.set(key, games);
    return games;
  } catch {
    return [];
  }
};

export const fetchLastGame = async (
  athleteId: string,
  sample: ComposerStatsSample = "preseason",
): Promise<LastGame | null> =>
  (await fetchRecentGames(athleteId, sample))[0] ?? null;
