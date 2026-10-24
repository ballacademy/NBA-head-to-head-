import { splitBalancedTitle } from "../instagramComposer/titleLayout";
import {
  datesInInclusiveRange,
  nextNDaysRange,
  rangeWeekLine,
  type ComposerDateRange,
} from "../instagramComposer/composerDateRange";
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

export { DEFAULT_BRAND, nextNDaysRange };

export const SCHEDULE_LIST_TOP = 236;
export const SCHEDULE_LIST_BOTTOM = 28;
export const SCHEDULE_DAY_GAP = 10;
export const SCHEDULE_LABEL_H = 22;

export const ESPN_SCOREBOARD_URL = (iso: string) =>
  `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${toEspnDateParam(iso)}&limit=100`;

export const DEFAULT_SCHEDULE_TITLE = "THIS WEEK";
export const SCHEDULE_TITLE_TRACK = 0.04;

export interface ScheduleGame {
  eventId: string;
  date: string;
  timeLabel: string;
  dateLabel: string;
  homeId: string;
  awayId: string;
  homeScore: string;
  awayScore: string;
  status: string;
}

export interface ScheduleDraft {
  brand: string;
  title: string;
  from: string;
  to: string;
  weekLine: string;
  games: ScheduleGame[];
  showBa?: boolean;
}

export const splitScheduleTitle = (title: string) =>
  splitBalancedTitle(title, DEFAULT_SCHEDULE_TITLE, SCHEDULE_TITLE_TRACK);

const rec = (value: unknown) =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : null;

const textOf = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const resolveTeam = (abbrev: string) => {
  const token = abbrev.trim().toUpperCase();
  if (getTeam(token)) {
    return token;
  }
  return ESPN_ABBREV_TO_TEAM[token] ?? "";
};

export const etDateOnly = (iso: string, fallback = "") => {
  const date = new Date(iso);
  if (!Number.isNaN(date.getTime()) && iso.includes("T")) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;
    if (year && month && day) {
      return `${year}-${month}-${day}`;
    }
  }
  return isoDateOnly(iso) || isoDateOnly(fallback);
};

const formatTimeLabel = (iso: string, shortDetail: string) => {
  const cleaned = shortDetail
    .replace(/^\d{1,2}\/\d{1,2}\s*[-–]\s*/u, "")
    .replace(/\s*(EDT|EST|ET)\s*$/i, " ET")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
  if (/\d/.test(cleaned) && /AM|PM/i.test(cleaned)) {
    return cleaned;
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return cleaned;
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
    .replace(/([AP]M)/, " $1 ET");
};

const formatDateLabel = (iso: string) => {
  const token = etDateOnly(iso) || isoDateOnly(iso);
  if (!token) {
    return "";
  }
  const date = new Date(`${token}T12:00:00-04:00`);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    month: "short",
    day: "numeric",
  })
    .format(date)
    .toUpperCase();
};

export const parseScoreboardGames = (
  payload: unknown,
  slateDate: string,
): ScheduleGame[] => {
  const root = rec(payload);
  const events = Array.isArray(root?.events) ? root.events : [];
  const games: ScheduleGame[] = [];
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
    let homeScore = "";
    let awayScore = "";
    competitors.forEach((row) => {
      const side = rec(row);
      const team = rec(side?.team);
      const id = resolveTeam(textOf(team?.abbreviation));
      if (!id) {
        return;
      }
      if (textOf(side?.homeAway) === "home") {
        homeId = id;
        homeScore = textOf(side?.score);
      } else {
        awayId = id;
        awayScore = textOf(side?.score);
      }
    });
    const status = rec(rec(item?.status)?.type);
    const date =
      etDateOnly(textOf(item?.date) || textOf(competition?.date), slateDate) ||
      slateDate;
    if (!homeId || !awayId) {
      return;
    }
    games.push({
      eventId: textOf(item?.id),
      date,
      timeLabel: formatTimeLabel(
        textOf(item?.date) || textOf(competition?.date),
        textOf(status?.shortDetail) || textOf(status?.detail),
      ),
      dateLabel: formatDateLabel(date),
      homeId,
      awayId,
      homeScore,
      awayScore,
      status: textOf(status?.name) || textOf(status?.state),
    });
  });
  return games;
};

export const fetchScheduleRange = async (
  range: ComposerDateRange,
): Promise<ScheduleGame[]> => {
  const dates = datesInInclusiveRange(range.from, range.to);
  const batches = await Promise.all(
    dates.map(async (iso) => {
      try {
        const response = await fetch(ESPN_SCOREBOARD_URL(iso), {
          mode: "cors",
          credentials: "omit",
        });
        if (!response.ok) {
          return [] as ScheduleGame[];
        }
        return parseScoreboardGames(await response.json(), iso);
      } catch {
        return [] as ScheduleGame[];
      }
    }),
  );
  return batches.flat();
};

export const defaultScheduleDraft = (
  now = new Date(),
): ScheduleDraft => {
  const range = nextNDaysRange(7, now);
  return {
    brand: DEFAULT_BRAND,
    title: DEFAULT_SCHEDULE_TITLE,
    from: range.from,
    to: range.to,
    weekLine: rangeWeekLine(range.from, range.to),
    games: [],
    showBa: false,
  };
};

export const isScheduleDraft = (value: unknown): value is ScheduleDraft =>
  Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as ScheduleDraft).brand === "string" &&
      typeof (value as ScheduleDraft).title === "string" &&
      Array.isArray((value as ScheduleDraft).games),
  );

export const normalizeScheduleDraft = (
  draft: ScheduleDraft,
  now = new Date(),
): ScheduleDraft => {
  const empty = defaultScheduleDraft(now);
  const from = isoDateOnly(draft.from) || empty.from;
  const to = isoDateOnly(draft.to) || empty.to;
  return {
    ...empty,
    ...draft,
    from,
    to,
    weekLine: (draft.weekLine ?? "").trim() || rangeWeekLine(from, to),
    games: Array.isArray(draft.games) ? draft.games : [],
    showBa: draft.showBa === true,
  };
};

export const scheduleBackToBackEventIds = (games: ScheduleGame[]) => {
  const byTeam = new Map<string, Array<{ date: string; eventId: string }>>();
  games.forEach((game) => {
    [game.awayId, game.homeId].forEach((teamId) => {
      if (!teamId) {
        return;
      }
      const rows = byTeam.get(teamId) ?? [];
      rows.push({ date: game.date, eventId: game.eventId || `${game.date}-${teamId}` });
      byTeam.set(teamId, rows);
    });
  });
  const ids = new Set<string>();
  byTeam.forEach((rows) => {
    const sorted = [...rows].sort((left, right) => left.date.localeCompare(right.date));
    for (let index = 1; index < sorted.length; index += 1) {
      const prev = Date.parse(`${sorted[index - 1]!.date}T12:00:00Z`);
      const next = Date.parse(`${sorted[index]!.date}T12:00:00Z`);
      if (Number.isFinite(prev) && Number.isFinite(next) && next - prev === 86_400_000) {
        ids.add(sorted[index - 1]!.eventId);
        ids.add(sorted[index]!.eventId);
      }
    }
  });
  return ids;
};

export const scheduleGroups = (games: ScheduleGame[]) => {
  const groups: Array<{ date: string; label: string; games: ScheduleGame[] }> =
    [];
  games.forEach((game) => {
    const last = groups[groups.length - 1];
    if (last && last.date === game.date) {
      last.games.push(game);
      return;
    }
    groups.push({
      date: game.date,
      label: game.dateLabel,
      games: [game],
    });
  });
  return groups;
};

export const scheduleFillLayout = (
  groups: Array<{ games: unknown[] }>,
  boardH = GRAPHIC_HEIGHT,
) => {
  const days = Math.max(1, groups.length);
  const listH = boardH - SCHEDULE_LIST_TOP - SCHEDULE_LIST_BOTTOM;
  const dayH =
    (listH - SCHEDULE_DAY_GAP * Math.max(0, days - 1)) / days;
  const gamesH = Math.max(36, dayH - SCHEDULE_LABEL_H);
  return {
    listTop: SCHEDULE_LIST_TOP,
    listBottom: SCHEDULE_LIST_BOTTOM,
    listH,
    days,
    dayH,
    labelH: SCHEDULE_LABEL_H,
    dayGap: SCHEDULE_DAY_GAP,
    gamesH,
    logo: Math.round(Math.min(52, Math.max(32, gamesH * 0.42))),
    type: Math.round(Math.min(22, Math.max(14, gamesH * 0.16))),
    time: Math.round(Math.min(16, Math.max(12, gamesH * 0.12))),
  };
};

export const tonightIso = (now = new Date()) => nbaTodayIso(now);
