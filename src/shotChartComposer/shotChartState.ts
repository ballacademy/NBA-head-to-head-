import { splitBalancedTitle } from "../instagramComposer/titleLayout";
import {
  datesInInclusiveRange,
  type ComposerDateRange,
} from "../instagramComposer/composerDateRange";
import {
  fetchRecentGames,
  gamesInInclusiveRange,
  isoDateOnly,
  type LastGame,
} from "../playerOfTheDayComposer/lastGame";
import { DEFAULT_BRAND } from "../standingsComposer/rankingState";
import { splitPlayerName } from "../teamOfTheWeekComposer/teamOfTheWeekState";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";

export { DEFAULT_BRAND };

export const ESPN_SUMMARY_URL = (eventId: string) =>
  `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${encodeURIComponent(eventId)}`;

export const DEFAULT_SHOT_CHART_TITLE = "SHOT CHART";
export const SHOT_CHART_TITLE_TRACK = 0.04;

export type ShotChartWindow = "last-game" | "range";

export interface ShotChartMake {
  x: number;
  y: number;
  made: boolean;
  text: string;
}

export interface ShotChartDraft {
  brand: string;
  title: string;
  playerId: string;
  firstName: string;
  lastName: string;
  teamId: string;
  photoSrc: string;
  window: ShotChartWindow;
  from: string;
  to: string;
  gameLabel: string;
  makes: number;
  attempts: number;
  shots: ShotChartMake[];
  showBa?: boolean;
}

export const splitShotChartTitle = (title: string) =>
  splitBalancedTitle(title, DEFAULT_SHOT_CHART_TITLE, SHOT_CHART_TITLE_TRACK);

const rec = (value: unknown) =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : null;

const textOf = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const numOf = (value: unknown) => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
};

export const parseShotChartPlays = (
  payload: unknown,
  playerId: string,
): ShotChartMake[] => {
  const root = rec(payload);
  const chart = rec(root?.shotchart) ?? rec(root?.shotChart);
  const plays = Array.isArray(chart?.plays)
    ? chart.plays
    : Array.isArray(root?.plays)
      ? root.plays
      : [];
  const shots: ShotChartMake[] = [];
  plays.forEach((play) => {
    const item = rec(play);
    if (!item) {
      return;
    }
    const participants = Array.isArray(item.participants)
      ? item.participants
      : [];
    const athleteIds = participants
      .map((row) => textOf(rec(rec(row)?.athlete)?.id) || textOf(rec(row)?.id))
      .filter(Boolean);
    const shooter =
      textOf(rec(item.athlete)?.id) ||
      athleteIds[0] ||
      "";
    if (shooter !== playerId) {
      return;
    }
    const shooting =
      item.shootingPlay === true ||
      Boolean(rec(item.coordinate)) ||
      /shot|layup|dunk|hook/i.test(textOf(rec(item.type)?.text));
    if (!shooting) {
      return;
    }
    const coord = rec(item.coordinate);
    const x = numOf(coord?.x);
    const y = numOf(coord?.y);
    if (x == null || y == null) {
      return;
    }
    shots.push({
      x,
      y,
      made: item.scoringPlay === true,
      text: textOf(item.text),
    });
  });
  return shots;
};

export const fetchShotChartForGame = async (
  eventId: string,
  playerId: string,
): Promise<ShotChartMake[]> => {
  if (!eventId || !playerId) {
    return [];
  }
  try {
    const response = await fetch(ESPN_SUMMARY_URL(eventId), {
      mode: "cors",
      credentials: "omit",
    });
    if (!response.ok) {
      return [];
    }
    return parseShotChartPlays(await response.json(), playerId);
  } catch {
    return [];
  }
};

export const gamesForShotWindow = (
  games: LastGame[],
  window: ShotChartWindow,
  range: ComposerDateRange,
) => {
  if (window === "last-game") {
    return games.slice(0, 1);
  }
  return gamesInInclusiveRange(games, range.from, range.to);
};

export const defaultShotChartDraft = (): ShotChartDraft => ({
  brand: DEFAULT_BRAND,
  title: DEFAULT_SHOT_CHART_TITLE,
  playerId: "",
  firstName: "",
  lastName: "",
  teamId: "",
  photoSrc: "",
  window: "last-game",
  from: "",
  to: "",
  gameLabel: "",
  makes: 0,
  attempts: 0,
  shots: [],
  showBa: false,
});

export const isShotChartDraft = (value: unknown): value is ShotChartDraft =>
  Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as ShotChartDraft).brand === "string" &&
      typeof (value as ShotChartDraft).title === "string" &&
      typeof (value as ShotChartDraft).playerId === "string" &&
      Array.isArray((value as ShotChartDraft).shots),
  );

export const applyShotChartPlayer = (
  draft: ShotChartDraft,
  playerId: string,
): ShotChartDraft => {
  const player = getPlayer(playerId);
  if (!player) {
    return { ...draft, playerId };
  }
  const names = splitPlayerName(player.name);
  return {
    ...draft,
    playerId: player.id,
    firstName: names.firstName,
    lastName: names.lastName,
    teamId: player.team,
    photoSrc: player.headshotUrl,
  };
};

export const shotLine = (makes: number, attempts: number) =>
  `${makes}-${attempts}`;

export const courtPoint = (shot: ShotChartMake, w: number, h: number) => {
  const px = (shot.x / 50) * w;
  const py = h - (shot.y / 47) * h;
  return { x: px, y: py };
};

export { datesInInclusiveRange, fetchRecentGames, isoDateOnly };
