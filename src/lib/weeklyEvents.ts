import internationalPlayerIds from "../../data/international-player-ids.json";
import { isAllStarPlayer, isSuperstarPlayer } from "./allStars";
import { getDailyDateKey } from "./dailyDraft";
import {
  generateFeasibleDraftSlotsUnderSalaryCap,
} from "./draft";
import { createSeededRandom } from "./seededRandom";
import { BUDGET_BADGE_SALARY_MAX, RANKED_SALARY_CAP } from "./salaryCap";
import type { DraftSlotConstraint, Player } from "./types";

export type EventRestrictionId =
  | "u25"
  | "intl"
  | "nostars"
  | "bargain"
  | "blind"
  | "agepos";

export type EventBadgeTier = "participation" | "bronze" | "silver" | "gold";

export interface WeeklyEventDefinition {
  id: string;
  weekLabel: string;
  title: string;
  description: string;
  restriction: EventRestrictionId;
  restrictionLabel: string;
  salaryCapLimit: number;
  maxMatches: number;
  sharedSlots: DraftSlotConstraint[];
}

export const EVENT_SALARY_CAP = RANKED_SALARY_CAP;
/** Bargain Bin runs a tighter team cap than other weekly events. */
export const EVENT_BARGAIN_SALARY_CAP = BUDGET_BADGE_SALARY_MAX;
export const EVENT_MAX_MATCHES = 30;
export const EVENT_LEADERBOARD_LIMIT = 100;

/** Weekly rotation order (ISO week number % length). */
export const EVENT_RESTRICTION_ROTATION = [
  "u25",
  "intl",
  "nostars",
  "bargain",
  "blind",
  "agepos",
] as const satisfies readonly EventRestrictionId[];

export const EVENT_BADGE_THRESHOLDS: Record<EventBadgeTier, number> = {
  participation: 10,
  bronze: 15,
  silver: 20,
  gold: 25,
};

const INTERNATIONAL_BBR_IDS = new Set(
  (internationalPlayerIds as { playerIds: string[] }).playerIds,
);

const EVENT_ID_PATTERN =
  /^(\d{4}-W\d{2})-(u25|intl|nostars|bargain|blind|agepos)$/;

export const isBlindEventRestriction = (restriction?: EventRestrictionId | null) =>
  restriction === "blind";

export const isAgePosEventRestriction = (
  restriction?: EventRestrictionId | null,
) => restriction === "agepos";

const pad2 = (value: number) => String(value).padStart(2, "0");

const isoWeekIdFromUtcCivilDate = (year: number, month: number, day: number) => {
  const utc = new Date(Date.UTC(year, month - 1, day));
  const weekday = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${pad2(week)}`;
};

/** ISO week id like 2026-W30 (America/New_York civil date, same as Daily). */
export const getIsoWeekId = (date: Date = new Date()): string => {
  const [year, month, day] = getDailyDateKey(date).split("-").map(Number);
  return isoWeekIdFromUtcCivilDate(year, month, day);
};

/** Legacy UTC ISO week used for event ids before Eastern weeks. */
export const getUtcIsoWeekId = (date: Date = new Date()): string =>
  isoWeekIdFromUtcCivilDate(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
  );

const eventIdForWeek = (weekId: string) =>
  buildEventId(weekId, getEventRestrictionForWeek(weekId));

/**
 * UTC event id when it disagrees with Eastern (Sunday evening ET /
 * Monday 00:00–04:00 UTC). Null when both calendars share a week.
 */
export const getLegacyUtcEventId = (date: Date = new Date()): string | null => {
  const easternWeekId = getIsoWeekId(date);
  const utcWeekId = getUtcIsoWeekId(date);
  if (easternWeekId === utcWeekId) {
    return null;
  }
  return eventIdForWeek(utcWeekId);
};

export const isCurrentEventId = (
  eventId: string,
  date: Date = new Date(),
): boolean => {
  if (eventId === eventIdForWeek(getIsoWeekId(date))) {
    return true;
  }
  const legacyId = getLegacyUtcEventId(date);
  return legacyId != null && eventId === legacyId;
};

export const formatEventWeekLabel = (weekId: string) => {
  const match = /^(\d{4})-W(\d{2})$/.exec(weekId);
  if (!match) {
    return weekId;
  }

  return `Week ${Number(match[2])} · ${match[1]}`;
};

export const isValidEventId = (value: string) => EVENT_ID_PATTERN.test(value);

export const getEventRestrictionForWeek = (
  weekId: string,
): EventRestrictionId => {
  const weekNumber = Number(weekId.slice(-2));
  const index =
    ((weekNumber % EVENT_RESTRICTION_ROTATION.length) +
      EVENT_RESTRICTION_ROTATION.length) %
    EVENT_RESTRICTION_ROTATION.length;
  return EVENT_RESTRICTION_ROTATION[index]!;
};

export const buildEventId = (
  weekId: string,
  restriction: EventRestrictionId = getEventRestrictionForWeek(weekId),
) => `${weekId}-${restriction}`;

export const getPlayerBbrId = (player: Player) => {
  if (player.bbrPlayerId) {
    return player.bbrPlayerId;
  }

  const { id } = player;
  return id.includes("-") ? id.slice(0, id.lastIndexOf("-")) : id;
};

export const isInternationalEventPlayer = (player: Player) =>
  INTERNATIONAL_BBR_IDS.has(getPlayerBbrId(player));

export const isUnder25EventPlayer = (player: Player) =>
  typeof player.age === "number" && player.age <= 25;

/** Role-player pool: no current All-Stars or superstars. */
export const isNoStarsEventPlayer = (player: Player) =>
  !isAllStarPlayer(player) && !isSuperstarPlayer(player);

/** Full pool under a tighter salary cap — eligibility is everyone. */
export const isBargainBinEventPlayer = (_player: Player) => true;

export const filterPlayersForEventRestriction = (
  players: Player[],
  restriction: EventRestrictionId,
) => {
  switch (restriction) {
    case "u25":
      return players.filter(isUnder25EventPlayer);
    case "intl":
      return players.filter(isInternationalEventPlayer);
    case "nostars":
      return players.filter(isNoStarsEventPlayer);
    case "bargain":
    case "blind":
    case "agepos":
      return players.filter(isBargainBinEventPlayer);
    default: {
      const _exhaustive: never = restriction;
      return _exhaustive;
    }
  }
};

export const getEventSalaryCap = (restriction: EventRestrictionId) =>
  restriction === "bargain" ? EVENT_BARGAIN_SALARY_CAP : EVENT_SALARY_CAP;

export const getEventRestrictionLabel = (restriction: EventRestrictionId) => {
  switch (restriction) {
    case "u25":
      return "25 & Under";
    case "intl":
      return "International Only";
    case "nostars":
      return "No Stars Allowed";
    case "bargain":
      return "Bargain Bin · $50M Cap";
    case "blind":
      return "Blind Draft";
    case "agepos":
      return "Age + Position Slots";
    default: {
      const _exhaustive: never = restriction;
      return _exhaustive;
    }
  }
};

export const getEventTitle = (restriction: EventRestrictionId) => {
  switch (restriction) {
    case "u25":
      return "Young and Coming";
    case "intl":
      return "World Squad Challenge";
    case "nostars":
      return "No Stars Allowed";
    case "bargain":
      return "Bargain Bin";
    case "blind":
      return "Blind Draft";
    case "agepos":
      return "Age Bracket Draft";
    default: {
      const _exhaustive: never = restriction;
      return _exhaustive;
    }
  }
};

export const getEventDescription = (restriction: EventRestrictionId) => {
  switch (restriction) {
    case "u25":
      return "Head-to-head with a shared board. Only players age 25 and under are eligible.";
    case "intl":
      return "Head-to-head with a shared board. Only international players are eligible.";
    case "nostars":
      return "Head-to-head with a shared board. All-Stars and superstars are locked out.";
    case "bargain":
      return "Head-to-head with a shared board and a strict $50M salary cap.";
    case "blind":
      return "Shared division + position board. Player lists are hidden — type the exact name to draft.";
    case "agepos":
      return "Shared board where each slot is a position plus an age band instead of a division.";
    default: {
      const _exhaustive: never = restriction;
      return _exhaustive;
    }
  }
};

export const buildSharedEventDraftSlots = (
  pool: Player[],
  eventId: string,
  salaryCapLimit = EVENT_SALARY_CAP,
  restriction?: EventRestrictionId,
): DraftSlotConstraint[] =>
  generateFeasibleDraftSlotsUnderSalaryCap(pool, salaryCapLimit, 5, {
    random: createSeededRandom(`event-slots:${eventId}`),
    slotAxis: restriction === "agepos" ? "age" : "division",
  });

export interface ScheduledWeeklyEventMeta {
  weekId: string;
  weekLabel: string;
  title: string;
  restriction: EventRestrictionId;
  restrictionLabel: string;
}

/** This week's scheduled event, even if the live pool isn't playable yet. */
export const getScheduledWeeklyEventMeta = (
  date: Date = new Date(),
): ScheduledWeeklyEventMeta => {
  const weekId = getIsoWeekId(date);
  const restriction = getEventRestrictionForWeek(weekId);
  return {
    weekId,
    weekLabel: formatEventWeekLabel(weekId),
    title: getEventTitle(restriction),
    restriction,
    restrictionLabel: getEventRestrictionLabel(restriction),
  };
};

export const formatWeeklyEventChooserMeta = (
  playable: WeeklyEventDefinition | null,
  scheduled: ScheduledWeeklyEventMeta = getScheduledWeeklyEventMeta(),
) =>
  playable
    ? `${playable.title} · this week`
    : `${scheduled.title} · check back`;

export const getWeeklyEventForWeekId = (
  weekId: string,
  players: Player[],
): WeeklyEventDefinition | null => {
  const restriction = getEventRestrictionForWeek(weekId);
  const id = buildEventId(weekId, restriction);
  const salaryCapLimit = getEventSalaryCap(restriction);
  const pool = filterPlayersForEventRestriction(players, restriction);

  if (pool.length < 25) {
    return null;
  }

  const sharedSlots = buildSharedEventDraftSlots(
    pool,
    id,
    salaryCapLimit,
    restriction,
  );

  if (sharedSlots.length !== 5) {
    return null;
  }

  return {
    id,
    weekLabel: formatEventWeekLabel(weekId),
    title: getEventTitle(restriction),
    description: getEventDescription(restriction),
    restriction,
    restrictionLabel: getEventRestrictionLabel(restriction),
    salaryCapLimit,
    maxMatches: EVENT_MAX_MATCHES,
    sharedSlots,
  };
};

export const getWeeklyEventForEventId = (
  eventId: string,
  players: Player[],
): WeeklyEventDefinition | null => {
  const match = EVENT_ID_PATTERN.exec(eventId);
  if (!match) {
    return null;
  }
  return getWeeklyEventForWeekId(match[1]!, players);
};

export const getCurrentWeeklyEvent = (
  players: Player[],
  date: Date = new Date(),
): WeeklyEventDefinition | null =>
  getWeeklyEventForWeekId(getIsoWeekId(date), players);

export const evaluateEventBadges = (params: {
  matchesPlayed: number;
  wins: number;
}): EventBadgeTier[] => {
  const badges: EventBadgeTier[] = [];

  if (params.matchesPlayed >= EVENT_BADGE_THRESHOLDS.participation) {
    badges.push("participation");
  }

  if (params.wins >= EVENT_BADGE_THRESHOLDS.bronze) {
    badges.push("bronze");
  }

  if (params.wins >= EVENT_BADGE_THRESHOLDS.silver) {
    badges.push("silver");
  }

  if (params.wins >= EVENT_BADGE_THRESHOLDS.gold) {
    badges.push("gold");
  }

  return badges;
};

const EVENT_BADGE_TIER_RANK: Record<EventBadgeTier, number> = {
  participation: 1,
  bronze: 2,
  silver: 3,
  gold: 4,
};

/** Highest earned event tier, or null if none. */
export const getTopEventBadgeTier = (
  badges: EventBadgeTier[],
): EventBadgeTier | null => {
  if (badges.length === 0) {
    return null;
  }

  return badges.reduce((best, tier) =>
    EVENT_BADGE_TIER_RANK[tier] > EVENT_BADGE_TIER_RANK[best] ? tier : best,
  );
};

export const formatEventBadgeLabel = (tier: EventBadgeTier) => {
  switch (tier) {
    case "gold":
      return "Gold";
    case "silver":
      return "Silver";
    case "bronze":
      return "Bronze";
    default:
      return "Competitor";
  }
};

export const formatEventBadgeEmoji = (tier: EventBadgeTier) => {
  switch (tier) {
    case "gold":
      return "🥇";
    case "silver":
      return "🥈";
    case "bronze":
      return "🥉";
    default:
      return "🎟️";
  }
};

export const formatEventBadgeDescription = (
  tier: EventBadgeTier,
  eventTitle: string,
) => {
  switch (tier) {
    case "gold":
      return `Earn ${EVENT_BADGE_THRESHOLDS.gold}+ wins in ${eventTitle}.`;
    case "silver":
      return `Earn ${EVENT_BADGE_THRESHOLDS.silver}+ wins in ${eventTitle}.`;
    case "bronze":
      return `Earn ${EVENT_BADGE_THRESHOLDS.bronze}+ wins in ${eventTitle}.`;
    default:
      return `Play ${EVENT_BADGE_THRESHOLDS.participation}+ matches in ${eventTitle}.`;
  }
};

/** Event identity for badge/UI surfaces that don't need draft slots. */
export const getCurrentEventMeta = (date: Date = new Date()) => {
  const weekId = getIsoWeekId(date);
  const restriction = getEventRestrictionForWeek(weekId);

  return {
    id: buildEventId(weekId, restriction),
    weekLabel: formatEventWeekLabel(weekId),
    title: getEventTitle(restriction),
    restrictionLabel: getEventRestrictionLabel(restriction),
    restriction,
  };
};

export const describeEventFromId = (eventId: string) => {
  const match = EVENT_ID_PATTERN.exec(eventId);

  if (!match) {
    return {
      id: eventId,
      weekLabel: eventId,
      title: "Weekly Event",
      restrictionLabel: "Event",
      restriction: "u25" as EventRestrictionId,
    };
  }

  const weekId = match[1]!;
  const restriction = match[2] as EventRestrictionId;

  return {
    id: eventId,
    weekLabel: formatEventWeekLabel(weekId),
    title: getEventTitle(restriction),
    restrictionLabel: getEventRestrictionLabel(restriction),
    restriction,
  };
};
