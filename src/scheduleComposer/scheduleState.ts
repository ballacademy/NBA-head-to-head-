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
import { DEFAULT_BRAND } from "../standingsComposer/rankingState";
import { getTeam } from "../standingsComposer/teams";

export { DEFAULT_BRAND, nextNDaysRange };

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

const formatTimeLabel = (iso: string, shortDetail: string) => {
  if (/\d/.test(shortDetail) && /AM|PM/i.test(shortDetail)) {
    return shortDetail
      .replace(/\s*(EDT|EST|ET)\s*$/i, " ET")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return shortDetail.toUpperCase();
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
  const token = isoDateOnly(iso);
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
    const date = isoDateOnly(textOf(item?.date)) || slateDate;
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

export const tonightIso = (now = new Date()) => nbaTodayIso(now);
