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

export const PICKS_LIST_BOTTOM = 22;
export const PICKS_GROUP_H = 18;
export const PICKS_PLATE_X = 56;
export const PICKS_HEADER_PAD = 8;
export const PICKS_BRAND_H = 32;
export const PICKS_PLATE_Y = PICKS_HEADER_PAD + PICKS_BRAND_H;
export const PICKS_TITLE_SIZE = 38;
export const PICKS_TITLE_LINE = 0.92;
export const PICKS_TITLE_PAD = 12;
export const PICKS_NOTCH_H = 34;
export const PICKS_NOTCH_OVERLAP = 2;
export const PICKS_AFTER_NOTCH = 8;

/** Tight plate: frame + padding + type (+ italic stroke), not a vacant block. */
export const picksTitlePlateH = (lineCount = 1) => {
  const lines = Math.max(1, Math.min(2, lineCount));
  return (
    8 +
    PICKS_TITLE_PAD * 2 +
    Math.ceil(PICKS_TITLE_SIZE * PICKS_TITLE_LINE * lines) +
    6
  );
};

export const picksListTop = (lineCount = 1) =>
  PICKS_PLATE_Y +
  picksTitlePlateH(lineCount) +
  PICKS_NOTCH_H -
  PICKS_NOTCH_OVERLAP +
  PICKS_AFTER_NOTCH;

export const PICKS_PLATE_H = picksTitlePlateH(1);
export const PICKS_LIST_TOP = picksListTop(1);
export const DEFAULT_PICKS_PLATE_OPACITY = 92;
export const PICKS_TITLE_SUFFIX = "NBA SPREAD PREDICTIONS";
export const DEFAULT_PICKS_TITLE = PICKS_TITLE_SUFFIX;
export const PICKS_TITLE_TRACK = 0.02;
export const PICKS_CHECK_FILL = "#1B8F5A";
export const PICKS_LOCK_FILL = "#E8B923";
export const PICKS_UNITS = ["0.5u", "1u", "2u", "3u"] as const;
export const NATIONAL_TV = new Set([
  "ESPN",
  "ESPN2",
  "TNT",
  "ABC",
  "NBA TV",
  "NBATV",
  "NBA",
  "PEACOCK",
  "AMAZON",
  "PRIME",
  "MAX",
  "NBC",
]);

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
  tip?: string;
  awayRecord?: string;
  homeRecord?: string;
  awayLast10?: string;
  homeLast10?: string;
  total?: number | null;
  awayMl?: string;
  homeMl?: string;
  awayJuice?: string;
  homeJuice?: string;
  tv?: string;
  units?: string;
  locked?: boolean;
  /** ESPN tip-off epoch ms. Missing/custom rows sort last. */
  startMs?: number;
}

export interface PicksDraft {
  brand: string;
  title: string;
  date: string;
  dateLine: string;
  games: PicksGame[];
  showBa?: boolean;
  showTotal?: boolean;
  showMoneyline?: boolean;
  showUnits?: boolean;
  /** 0–100. Default is solid metal, not a glass wash. */
  plateOpacity?: number;
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

export const picksDefaultTitle = (iso: string) => {
  const token = isoDateOnly(iso);
  if (!token) {
    return DEFAULT_PICKS_TITLE;
  }
  const parts = token.split("-");
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!Number.isFinite(month) || !Number.isFinite(day) || month < 1 || day < 1) {
    return DEFAULT_PICKS_TITLE;
  }
  return `${month}/${day} ${PICKS_TITLE_SUFFIX}`;
};

export const isAutoPicksTitle = (title: string) => {
  const current = title.trim().toUpperCase();
  if (
    !current ||
    current === "PICKS" ||
    current === PICKS_TITLE_SUFFIX
  ) {
    return true;
  }
  return /^\d{1,2}\/\d{1,2}\s+NBA SPREAD PREDICTIONS$/.test(current);
};

export const splitPicksTitle = (title: string, iso = "") =>
  splitBalancedTitle(
    title,
    iso ? picksDefaultTitle(iso) : DEFAULT_PICKS_TITLE,
    PICKS_TITLE_TRACK,
  );

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

/** Format a signed spread. Empty when there is no line — never invent. */
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

/** Home line is the inverse of the stored away line. PK and missing stay as-is. */
export const picksLineForSide = (
  line: number | null | undefined,
  side: PicksSide | null | undefined,
): number | null => {
  if (line == null || !Number.isFinite(line)) {
    return null;
  }
  if (side === "home" && line !== 0) {
    return -line;
  }
  return line;
};

/** Checked side’s line in the middle; unchecked rows keep the left/away number. */
export const formatPicksGameLine = (game: {
  line: number | null;
  pick: PicksSide | null;
}) => formatPicksLine(picksLineForSide(game.line, game.pick));

export const awayLineFromDisplayed = (
  displayed: number | null,
  side: PicksSide | null | undefined,
): number | null => {
  if (displayed == null) {
    return null;
  }
  if (side === "home" && displayed !== 0) {
    return -displayed;
  }
  return displayed;
};

export const formatPicksSideTicket = (
  game: PicksGame,
  side: PicksSide,
) => {
  const id = side === "away" ? game.awayId : game.homeId;
  const line = formatPicksLine(picksLineForSide(game.line, side));
  if (!id && !line) {
    return "";
  }
  if (!line) {
    return id;
  }
  if (!id) {
    return line;
  }
  return `${id} ${line}`;
};

export const clampPicksPlateOpacity = (value: unknown) => {
  const parsed =
    typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(parsed)) {
    return DEFAULT_PICKS_PLATE_OPACITY;
  }
  return Math.round(Math.min(100, Math.max(0, parsed)));
};

export const picksDatePill = (dateLine: string, games: number) => {
  const date = dateLine.trim().toUpperCase();
  if (!games) {
    return date;
  }
  return `${date}  ·  ${games} GAME${games === 1 ? "" : "S"}`;
};

export const formatPicksTotal = (total?: number | null) => {
  if (total == null || !Number.isFinite(total)) {
    return "";
  }
  return `O/U ${total}`;
};

export const picksMl = (game: PicksGame, side: PicksSide) =>
  (side === "away" ? game.awayMl : game.homeMl) || "";

export const picksJuiceOrMove = (game: PicksGame, side: PicksSide) => {
  if (game.lineEdited) {
    return "↗";
  }
  return (side === "away" ? game.awayJuice : game.homeJuice) || "";
};

export const nextPicksUnits = (current?: string) => {
  const index = PICKS_UNITS.indexOf(
    (current as (typeof PICKS_UNITS)[number]) ?? "1u",
  );
  const from = index >= 0 ? index : 0;
  return PICKS_UNITS[(from + 1) % PICKS_UNITS.length];
};

export const picksShortName = (teamId: string) => {
  const team = getTeam(teamId);
  if (!team) {
    return teamId || "TEAM";
  }
  const short = team.shortName.toUpperCase();
  if (short === "TRAIL BLAZERS") {
    return "BLAZERS";
  }
  if (short === "TIMBERWOLVES") {
    return "T-WOLVES";
  }
  return short;
};

/** Home name is `@ LAKERS` — never a trailing `LAKERS @`. */
export const picksNameLabel = (teamId: string, side: PicksSide) => {
  const name = picksShortName(teamId);
  if (!name) {
    return "";
  }
  return side === "home" ? `@ ${name}` : name;
};

export const picksRecordLine = (record?: string, last10?: string) => {
  const rec = (record ?? "").trim();
  const ten = (last10 ?? "").trim();
  if (rec && ten) {
    return `${rec}  L10 ${ten}`;
  }
  return rec;
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

const parseAmericanOdds = (value: unknown): string => {
  const token = textOf(value);
  if (/^[+-]\d+$/.test(token)) {
    return token;
  }
  return "";
};

const closeOdds = (side: unknown): string => {
  const item = rec(side);
  const close = rec(item?.close);
  return parseAmericanOdds(close?.odds) || parseAmericanOdds(item?.odds);
};

const firstOdds = (competition: unknown) => {
  const odds = rec(competition)?.odds;
  return rec(Array.isArray(odds) ? odds[0] : null);
};

export const parseEspnTotal = (competition: unknown): number | null =>
  finiteNumber(firstOdds(competition)?.overUnder);

export const parseEspnMoneyline = (
  competition: unknown,
  side: PicksSide,
): string => {
  const money = rec(firstOdds(competition)?.moneyline);
  return closeOdds(side === "away" ? money?.away : money?.home);
};

export const parseEspnJuice = (
  competition: unknown,
  side: PicksSide,
): string => {
  const spread = rec(firstOdds(competition)?.pointSpread);
  return closeOdds(side === "away" ? spread?.away : spread?.home);
};

export const parseEspnRecord = (
  competitor: unknown,
  kind: "total" | "lastten" | "home" | "road",
): string => {
  const records = Array.isArray(rec(competitor)?.records)
    ? (rec(competitor)!.records as unknown[])
    : [];
  const match = records.find((row) => {
    const item = rec(row);
    const type = textOf(item?.type).toLowerCase();
    const name = textOf(item?.name).toLowerCase();
    if (kind === "lastten") {
      return type === "lastten" || name.includes("last 10") || name.includes("last ten");
    }
    return type === kind || name === kind;
  });
  return textOf(rec(match)?.summary);
};

export const parseEspnStartMs = (event: unknown, competition: unknown): number => {
  const iso = textOf(rec(event)?.date) || textOf(rec(competition)?.date);
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

export const picksStartMs = (game: Pick<PicksGame, "startMs">) => {
  const ms = game.startMs;
  if (typeof ms === "number" && Number.isFinite(ms) && ms > 0) {
    return ms;
  }
  return Number.MAX_SAFE_INTEGER;
};

export const sortPicksGames = (games: PicksGame[]) =>
  [...games].sort((left, right) => {
    const start = picksStartMs(left) - picksStartMs(right);
    if (start !== 0) {
      return start;
    }
    const away = left.awayId.localeCompare(right.awayId);
    if (away !== 0) {
      return away;
    }
    return left.homeId.localeCompare(right.homeId);
  });

export const parseEspnTip = (event: unknown, competition: unknown): string => {
  const status = rec(rec(event)?.status)?.type ?? rec(rec(competition)?.status)?.type;
  const shortDetail = textOf(rec(status)?.shortDetail) || textOf(rec(status)?.detail);
  const cleaned = shortDetail
    .replace(/^\d{1,2}\/\d{1,2}\s*[-–]\s*/u, "")
    .replace(/\s*(EDT|EST|ET)\s*$/i, " ET")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
  if (/\d/.test(cleaned) && /AM|PM/i.test(cleaned)) {
    return cleaned.replace(/\s+/g, " ").replace(/\s*[AP]M\s*/i, " ").replace(/\s+/g, " ").trim();
  }
  const iso = textOf(rec(event)?.date) || textOf(rec(competition)?.date);
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
    .format(date)
    .toUpperCase()
    .replace(" ", "")
    .replace(/\s*[AP]M/i, "")
    .trim() + " ET";
};

export const parseEspnNationalTv = (competition: unknown): string => {
  const names: string[] = [];
  const item = rec(competition);
  const broadcasts = Array.isArray(item?.broadcasts) ? item.broadcasts : [];
  broadcasts.forEach((row) => {
    const list = rec(row)?.names;
    if (Array.isArray(list)) {
      list.forEach((name) => names.push(textOf(name)));
    }
  });
  const geo = Array.isArray(item?.geoBroadcasts) ? item.geoBroadcasts : [];
  geo.forEach((row) => {
    names.push(textOf(rec(rec(row)?.media)?.shortName));
  });
  const hit = names.find((name) => NATIONAL_TV.has(name.toUpperCase().replace(/\s+/g, " ")));
  if (!hit) {
    return "";
  }
  const token = hit.toUpperCase();
  if (token === "NBATV" || token === "NBA") {
    return "NBA TV";
  }
  return token;
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
    let homeRow: unknown = null;
    let awayRow: unknown = null;
    competitors.forEach((row) => {
      const side = rec(row);
      const team = rec(side?.team);
      const id = resolvePicksTeam(textOf(team?.abbreviation));
      if (!id) {
        return;
      }
      if (textOf(side?.homeAway) === "home") {
        homeId = id;
        homeRow = row;
      } else {
        awayId = id;
        awayRow = row;
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
      startMs: parseEspnStartMs(event, competition),
      tip: parseEspnTip(event, competition),
      awayRecord: parseEspnRecord(awayRow, "total"),
      homeRecord: parseEspnRecord(homeRow, "total"),
      awayLast10: parseEspnRecord(awayRow, "lastten"),
      homeLast10: parseEspnRecord(homeRow, "lastten"),
      total: parseEspnTotal(competition),
      awayMl: parseEspnMoneyline(competition, "away"),
      homeMl: parseEspnMoneyline(competition, "home"),
      awayJuice: parseEspnJuice(competition, "away"),
      homeJuice: parseEspnJuice(competition, "home"),
      tv: parseEspnNationalTv(competition),
      units: "1u",
    });
  });
  void slateDate;
  return sortPicksGames(games);
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
  units: "1u",
  startMs: 0,
});

export const isPicksRowEdited = (game: PicksGame) =>
  game.custom === true ||
  game.lineEdited === true ||
  game.teamsEdited === true ||
  !game.eventId;

export const togglePicksPick = (game: PicksGame, side: PicksSide): PicksGame => {
  const pick = game.pick === side ? null : side;
  return {
    ...game,
    pick,
    locked: pick ? game.locked : false,
  };
};

export const setPicksLine = (game: PicksGame, line: number | null): PicksGame => ({
  ...game,
  line,
  lineEdited: true,
});

/** Commit a typed number for that side (the ticket you clicked, else the pick). */
export const setPicksDisplayedLine = (
  game: PicksGame,
  displayed: number | null,
  side?: PicksSide | null,
): PicksGame =>
  setPicksLine(game, awayLineFromDisplayed(displayed, side ?? game.pick));

export const setPicksLock = (games: PicksGame[], gameId: string): PicksGame[] =>
  games.map((game) => ({
    ...game,
    locked: game.id === gameId ? !game.locked : false,
  }));

export const cyclePicksUnits = (game: PicksGame): PicksGame => ({
  ...game,
  units: nextPicksUnits(game.units),
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
    locked: prev.locked === true,
    units: prev.units || incoming.units || "1u",
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
  return sortPicksGames(next);
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
    locked: game.locked === true && Boolean(pick),
    units: game.units || match.units,
  };
};

export const defaultPicksDraft = (now = new Date()): PicksDraft => {
  const date = nbaTodayIso(now);
  return {
    brand: DEFAULT_BRAND,
    title: picksDefaultTitle(date),
    date,
    dateLine: picksDateLine(date),
    games: [],
    showBa: false,
    showTotal: false,
    showMoneyline: false,
    showUnits: false,
    plateOpacity: DEFAULT_PICKS_PLATE_OPACITY,
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
    tip: textOf(row.tip),
    awayRecord: textOf(row.awayRecord),
    homeRecord: textOf(row.homeRecord),
    awayLast10: textOf(row.awayLast10),
    homeLast10: textOf(row.homeLast10),
    total: row.total == null || row.total === "" ? null : finiteNumber(row.total),
    awayMl: parseAmericanOdds(row.awayMl),
    homeMl: parseAmericanOdds(row.homeMl),
    awayJuice: parseAmericanOdds(row.awayJuice),
    homeJuice: parseAmericanOdds(row.homeJuice),
    tv: textOf(row.tv),
    units: textOf(row.units) || "1u",
    locked: row.locked === true,
    startMs: finiteNumber(row.startMs) ?? 0,
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
    title: isAutoPicksTitle(draft.title)
      ? picksDefaultTitle(date)
      : draft.title || picksDefaultTitle(date),
    dateLine:
      (draft.dateLine ?? "").trim() || picksDateLine(date),
    games,
    showBa: draft.showBa === true,
    showTotal: draft.showTotal === true,
    showMoneyline: draft.showMoneyline === true,
    showUnits: draft.showUnits === true,
    plateOpacity: clampPicksPlateOpacity(
      draft.plateOpacity ?? DEFAULT_PICKS_PLATE_OPACITY,
    ),
  };
};

export const picksFillLayout = (
  count: number,
  boardH = GRAPHIC_HEIGHT,
  groupCount = 0,
  lineCount = 1,
) => {
  const games = Math.max(0, count);
  const rows = Math.max(1, games);
  const groups = Math.max(0, groupCount);
  const labels = groups > 1 ? groups * PICKS_GROUP_H : 0;
  const listTop = picksListTop(lineCount);
  const listH = boardH - listTop - PICKS_LIST_BOTTOM;
  const usable = Math.max(48, listH - labels);
  const gap = games <= 1 ? 0 : Math.min(6, usable * 0.006);
  const rowH = (usable - gap * Math.max(0, rows - 1)) / rows;
  const clamp = (min: number, max: number, value: number) =>
    Math.round(Math.min(max, Math.max(min, value)));
  return {
    listTop,
    listBottom: PICKS_LIST_BOTTOM,
    listH,
    rows,
    rowH,
    gap,
    groupH: groups > 1 ? PICKS_GROUP_H : 0,
    logo: clamp(48, 96, rowH * 0.82),
    line: clamp(16, 36, rowH * 0.28),
    name: clamp(11, 18, rowH * 0.16),
    meta: clamp(9, 13, rowH * 0.12),
    check: clamp(16, 28, rowH * 0.26),
  };
};

export const picksScoreboardUrl = (iso: string) =>
  PICKS_SCOREBOARD_URL(isoDateOnly(iso) || iso);
