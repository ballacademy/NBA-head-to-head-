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
import { shotToPx } from "./shotChartLayout";

export { DEFAULT_BRAND };

/** Same host as box-score fetches — `site.api` summaries omit PBP coordinates. */
export const ESPN_SUMMARY_URL = (eventId: string) =>
  `https://site.web.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${encodeURIComponent(eventId)}`;

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
  showMakes?: boolean;
  showMisses?: boolean;
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

const playTypeText = (item: Record<string, unknown>) =>
  textOf(rec(item.type)?.text) || textOf(item.shortDescription);

const isFreeThrow = (item: Record<string, unknown>) =>
  /free\s*throw/i.test(playTypeText(item));

const shooterId = (item: Record<string, unknown>) => {
  const athlete = textOf(rec(item.athlete)?.id);
  if (athlete) {
    return athlete;
  }
  const participants = Array.isArray(item.participants)
    ? item.participants
    : [];
  const first = rec(participants[0]);
  return textOf(rec(first?.athlete)?.id) || textOf(first?.id);
};

const isOnCourtCoord = (x: number, y: number) =>
  x >= -2 && x <= 52 && y >= -8 && y <= 48;

/** Real ESPN play-by-play x/y in feet. Never invents or jitters dots. */
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
  const want = String(playerId);
  const shots: ShotChartMake[] = [];
  plays.forEach((play) => {
    const item = rec(play);
    if (!item || item.shootingPlay !== true || isFreeThrow(item)) {
      return;
    }
    if (shooterId(item) !== want) {
      return;
    }
    const coord = rec(item.coordinate);
    const x = numOf(coord?.x);
    const y = numOf(coord?.y);
    if (x == null || y == null || !isOnCourtCoord(x, y)) {
      return;
    }
    const attempted = numOf(item.pointsAttempted);
    if (attempted != null && attempted < 2) {
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
  showMakes: true,
  showMisses: true,
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

export const courtPoint = (shot: ShotChartMake, w: number, h: number) =>
  shotToPx(shot, { x: 0, y: 0, w, h });

export const SHOT_ZONES = [
  { id: "ra", label: "RESTRICTED" },
  { id: "paint", label: "PAINT" },
  { id: "mid", label: "MID" },
  { id: "left-c3", label: "L CORNER 3" },
  { id: "right-c3", label: "R CORNER 3" },
  { id: "break-3", label: "ABOVE BREAK 3" },
] as const;

export type ShotZoneId = (typeof SHOT_ZONES)[number]["id"];

export const shotZone = (shot: ShotChartMake): ShotZoneId => {
  const dx = shot.x - 25;
  const dist = Math.hypot(dx, shot.y);
  const left = shot.x < 25;
  const corner = shot.y <= 14;
  if (dist > 22 && corner) {
    return left ? "left-c3" : "right-c3";
  }
  if (dist > 23.75) {
    return "break-3";
  }
  if (dist <= 8) {
    return "ra";
  }
  if (Math.abs(dx) <= 8 && shot.y <= 19) {
    return "paint";
  }
  return "mid";
};

export const visibleShots = (
  shots: ShotChartMake[],
  showMakes = true,
  showMisses = true,
) =>
  shots.filter((shot) => (shot.made ? showMakes !== false : showMisses !== false));

export const shotZoneSplits = (shots: ShotChartMake[]) =>
  SHOT_ZONES.map((zone) => {
    const rows = shots.filter((shot) => shotZone(shot) === zone.id);
    const makes = rows.filter((shot) => shot.made).length;
    return {
      id: zone.id,
      label: zone.label,
      makes,
      attempts: rows.length,
    };
  });

export const formatZoneSplit = (makes: number, attempts: number) =>
  `${makes}–${attempts}`;

export { datesInInclusiveRange, fetchRecentGames, isoDateOnly };
