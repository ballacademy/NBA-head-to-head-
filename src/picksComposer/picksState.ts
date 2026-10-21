import { splitBalancedTitle } from "../instagramComposer/titleLayout";
import {
  ESPN_ABBREV_TO_TEAM,
  isoDateOnly,
  nbaTodayIso,
  toEspnDateParam,
} from "../playerOfTheDayComposer/lastGame";
import {
  DEFAULT_BRAND,
  GRAPHIC_HEIGHT,
} from "../standingsComposer/rankingState";
import { getTeam } from "../standingsComposer/teams";

export { DEFAULT_BRAND };

/** `site.web.api` sends CORS; `site.api` does not from the composer origin. */
export const PICKS_SCOREBOARD_URL = (iso: string) =>
  `https://site.web.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${toEspnDateParam(iso)}&limit=100`;

export const PICKS_LIST_TOP = 220;
export const PICKS_LIST_BOTTOM = 32;
export const DEFAULT_PICKS_TITLE = "PICKS";
export const PICKS_TITLE_TRACK = 0.04;
export const PICKS_CHECK_FILL = "#1B8F5A";

export type PicksSide = "away" | "home";

export interface PicksGame {
  id: string;
  eventId: string;
  awayId: string;
  homeId: string;
  /** Away-team spread. `0` is PK; `null` means no line (never invented). */
  line: number | null;
  pick: PicksSide | null;
  lineEdited?: boolean;
  teamsEdited?: boolean;
  custom?: boolean;
}

export interface PicksDraft {
  brand: string;
  title: string;
  date: string;
  dateLine: string;
  games: PicksGame[];
  showBa?: boolean;
}

const rec = (value: unknown) =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : null;

const textOf = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

let picksRowSeq = 0;

export const newPicksRowId = () => {
  picksRowSeq += 1;
  return `picks-${Date.now().toString(36)}-${picksRowSeq.toString(36)}`;
};

export const resolvePicksTeam = (abbrev: string) => {
  const token = abbrev.trim().toUpperCase();
  if (!token) {
    return "";
  }
  if (getTeam(token)) {
    return token;
  }
  return ESPN_ABBREV_TO_TEAM[token] ?? "";
};

export const splitPicksTitle = (title: string) =>
  splitBalancedTitle(title, DEFAULT_PICKS_TITLE, PICKS_TITLE_TRACK);

export const picksDateLine = (iso: string) => {
  const token = isoDateOnly(iso);
  if (!token) {
    return "";
  }
  const date = new Date(`${token}T12:00:00-04:00`);
  if (Number.isNaN(date.getTime())) {
    return token;
  }
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    month: "short",
    day: "numeric",
  })
    .format(date)
    .toUpperCase();
};

export const isAutoPicksDateLine = (line: string, iso: string) => {
  const current = line.trim().toUpperCase();
  return !current || current === picksDateLine(iso);
};

const finiteNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

/** Format the away spread for the middle of the row. Empty when there is no line. */
export const formatPicksLine = (line: number | null | undefined) => {
  if (line == null || !Number.isFinite(line)) {
    return "";
  }
  if (line === 0) {
    return "PK";
  }
  const abs = Math.abs(line);
  const body = Number.isInteger(abs) ? String(abs) : String(abs);
  return `${line > 0 ? "+" : "-"}${body}`;
};

export const parsePicksLineInput = (raw: string): number | null | undefined => {
  const token = raw
    .trim()
    .toUpperCase()
    .replace(/[−–—]/g, "-")
    .replace(/\s+/g, "");
  if (!token) {
    return null;
  }
  if (
    token === "PK" ||
    token === "PICK" ||
    token === "PICKEM" ||
    token === "PICK'EM" ||
    token === "EVEN"
  ) {
    return 0;
  }
  const match = token.match(/^([+-]?)(\d+(?:\.\d+)?)$/);
  if (!match) {
    return undefined;
  }
  const value = Number(`${match[1] ?? ""}${match[2]}`);
  return Number.isFinite(value) ? value : undefined;
};

const parseDetailsAwayLine = (
  details: string,
  awayId: string,
  homeId: string,
): number | null => {
  const token = details.trim().toUpperCase();
  if (!token) {
    return null;
  }
  if (token === "EVEN" || token === "PK" || token === "PICK") {
    return 0;
  }
  const match = token.match(/^([A-Z]{2,4})\s*([+-]?\d+(?:\.\d+)?)$/);
  if (!match) {
    return null;
  }
  const team = resolvePicksTeam(match[1] ?? "");
  const spread = Number(match[2]);
  if (!team || !Number.isFinite(spread)) {
    return null;
  }
  if (team === awayId) {
    return spread;
  }
  if (team === homeId) {
    return -spread;
  }
  return null;
};

/** Away spread from ESPN odds. Returns null when the board has no real line. */
export const parseEspnAwayLine = (
  competition: unknown,
  awayId: string,
  homeId: string,
): number | null => {
  const item = rec(competition);
  const oddsList = Array.isArray(item?.odds) ? item.odds : [];
  if (!oddsList.length) {
    return null;
  }
  const odds = rec(oddsList[0]);
  if (!odds) {
    return null;
  }
  const fromDetails = parseDetailsAwayLine(textOf(odds.details), awayId, homeId);
  if (fromDetails != null) {
    return fromDetails;
  }
  const awayListed = finiteNumber(rec(odds.awayTeamOdds)?.spread);
  if (awayListed != null) {
    return awayListed;
  }
  const homeListed = finiteNumber(rec(odds.homeTeamOdds)?.spread);
  if (homeListed != null) {
    return -homeListed;
  }
  const spread = finiteNumber(odds.spread);
  if (spread != null) {
    return -spread;
  }
  return null;
};

export const parsePicksScoreboard = (
  payload: unknown,
  slateDate: string,
): PicksGame[] => {
  const root = rec(payload);
  const events = Array.isArray(root?.events) ? root.events : [];
  const games: PicksGame[] = [];
  events.forEach((event) => {
    const item = rec(event);
    const competition = rec(
      Array.isArray(item?.competitions) ? item.competitions[0] : null,
    );
    const competitors = Array.isArray(competition?.competitors)
      ? competition.competitors
      : [];
    let homeId = "";
    let awayId = "";
    competitors.forEach((row) => {
      const side = rec(row);
      const team = rec(side?.team);
      const id = resolvePicksTeam(textOf(team?.abbreviation));
      if (!id) {
        return;
      }
      if (textOf(side?.homeAway) === "home") {
        homeId = id;
      } else {
        awayId = id;
      }
    });
    if (!homeId || !awayId) {
      return;
    }
    games.push({
      id: newPicksRowId(),
      eventId: textOf(item?.id),
      awayId,
      homeId,
      line: parseEspnAwayLine(competition, awayId, homeId),
      pick: null,
    });
  });
  void slateDate;
  return games;
};

export const fetchPicksSlate = async (iso: string): Promise<PicksGame[]> => {
  const date = isoDateOnly(iso) || nbaTodayIso();
  try {
    const response = await fetch(PICKS_SCOREBOARD_URL(date), {
      mode: "cors",
      credentials: "omit",
    });
    if (!response.ok) {
      return [];
    }
    return parsePicksScoreboard(await response.json(), date);
  } catch {
    return [];
  }
};

export const emptyPicksGame = (): PicksGame => ({
  id: newPicksRowId(),
  eventId: "",
  awayId: "",
  homeId: "",
  line: null,
  pick: null,
  custom: true,
});

export const isPicksRowEdited = (game: PicksGame) =>
  game.custom === true ||
  game.lineEdited === true ||
  game.teamsEdited === true ||
  !game.eventId;

export const togglePicksPick = (game: PicksGame, side: PicksSide): PicksGame => ({
  ...game,
  pick: game.pick === side ? null : side,
});

export const setPicksLine = (game: PicksGame, line: number | null): PicksGame => ({
  ...game,
  line,
  lineEdited: true,
});

export const setPicksTeam = (
  game: PicksGame,
  side: PicksSide,
  teamId: string,
): PicksGame => {
  const nextId = resolvePicksTeam(teamId);
  const currentId = side === "away" ? game.awayId : game.homeId;
  if (nextId === currentId) {
    return game;
  }
  const pick = game.pick === side && nextId !== currentId ? null : game.pick;
  return {
    ...game,
    awayId: side === "away" ? nextId : game.awayId,
    homeId: side === "home" ? nextId : game.homeId,
    pick,
    teamsEdited: true,
    custom: game.custom === true || !game.eventId,
  };
};

const mergePicksRow = (prev: PicksGame, incoming: PicksGame): PicksGame => {
  const awayId = prev.teamsEdited ? prev.awayId : incoming.awayId;
  const homeId = prev.teamsEdited ? prev.homeId : incoming.homeId;
  const line = prev.lineEdited ? prev.line : incoming.line;
  let pick = prev.pick;
  if (pick === "away" && awayId !== prev.awayId) {
    pick = null;
  }
  if (pick === "home" && homeId !== prev.homeId) {
    pick = null;
  }
  return {
    ...incoming,
    id: prev.id,
    awayId,
    homeId,
    line,
    pick,
    lineEdited: prev.lineEdited === true,
    teamsEdited: prev.teamsEdited === true,
    custom: prev.custom === true,
    eventId: incoming.eventId || prev.eventId,
  };
};

export const mergePicksFill = (
  current: PicksGame[],
  incoming: PicksGame[],
): PicksGame[] => {
  const byEvent = new Map<string, PicksGame>();
  current.forEach((game) => {
    if (game.eventId) {
      byEvent.set(game.eventId, game);
    }
  });
  const consumed = new Set<string>();
  const next = incoming.map((row) => {
    const prev = row.eventId ? byEvent.get(row.eventId) : undefined;
    if (!prev) {
      return row;
    }
    consumed.add(prev.id);
    return mergePicksRow(prev, row);
  });
  current.forEach((game) => {
    if (consumed.has(game.id)) {
      return;
    }
    if (isPicksRowEdited(game)) {
      next.push(game);
    }
  });
  return next;
};

/** Re-apply slate data to one row, dropping that row's manual flags. */
export const refillPicksRow = (
  game: PicksGame,
  incoming: PicksGame[],
): PicksGame => {
  const match = game.eventId
    ? incoming.find((row) => row.eventId === game.eventId)
    : undefined;
  if (!match) {
    return game;
  }
  let pick = game.pick;
  if (pick === "away" && match.awayId !== game.awayId) {
    pick = null;
  }
  if (pick === "home" && match.homeId !== game.homeId) {
    pick = null;
  }
  return {
    ...match,
    id: game.id,
    pick,
  };
};

export const defaultPicksDraft = (now = new Date()): PicksDraft => {
  const date = nbaTodayIso(now);
  return {
    brand: DEFAULT_BRAND,
    title: DEFAULT_PICKS_TITLE,
    date,
    dateLine: picksDateLine(date),
    games: [],
    showBa: false,
  };
};

export const isPicksDraft = (value: unknown): value is PicksDraft =>
  Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as PicksDraft).brand === "string" &&
      typeof (value as PicksDraft).title === "string" &&
      Array.isArray((value as PicksDraft).games),
  );

const isPicksSide = (value: unknown): value is PicksSide =>
  value === "away" || value === "home";

const normalizeGame = (value: unknown): PicksGame | null => {
  const row = rec(value);
  if (!row) {
    return null;
  }
  const awayId = resolvePicksTeam(textOf(row.awayId));
  const homeId = resolvePicksTeam(textOf(row.homeId));
  const line = finiteNumber(row.line);
  return {
    id: textOf(row.id) || newPicksRowId(),
    eventId: textOf(row.eventId),
    awayId,
    homeId,
    line: row.line == null || row.line === "" ? null : line,
    pick: isPicksSide(row.pick) ? row.pick : null,
    lineEdited: row.lineEdited === true,
    teamsEdited: row.teamsEdited === true,
    custom: row.custom === true || !textOf(row.eventId),
  };
};

export const normalizePicksDraft = (
  draft: PicksDraft,
  now = new Date(),
): PicksDraft => {
  const empty = defaultPicksDraft(now);
  const date = isoDateOnly(draft.date) || empty.date;
  const games = Array.isArray(draft.games)
    ? draft.games.map(normalizeGame).filter((row): row is PicksGame => Boolean(row))
    : [];
  return {
    ...empty,
    ...draft,
    date,
    dateLine:
      (draft.dateLine ?? "").trim() || picksDateLine(date),
    games,
    showBa: draft.showBa === true,
  };
};

export const picksFillLayout = (
  count: number,
  boardH = GRAPHIC_HEIGHT,
) => {
  const games = Math.max(0, count);
  const rows = Math.max(1, games);
  const listH = boardH - PICKS_LIST_TOP - PICKS_LIST_BOTTOM;
  const gap = games <= 1 ? 0 : Math.min(8, listH * 0.008);
  const rowH = (listH - gap * Math.max(0, rows - 1)) / rows;
  const clamp = (min: number, max: number, value: number) =>
    Math.round(Math.min(max, Math.max(min, value)));
  return {
    listTop: PICKS_LIST_TOP,
    listBottom: PICKS_LIST_BOTTOM,
    listH,
    rows,
    rowH,
    gap,
    logo: clamp(34, 86, rowH * 0.7),
    line: clamp(22, 54, rowH * 0.42),
    name: clamp(11, 20, rowH * 0.18),
    check: clamp(18, 34, rowH * 0.3),
  };
};

export const picksScoreboardUrl = (iso: string) =>
  PICKS_SCOREBOARD_URL(isoDateOnly(iso) || iso);
