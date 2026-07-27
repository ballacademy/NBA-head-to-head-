import internationalPlayerIds from "../../data/international-player-ids.json";
import {
  generateFeasibleDraftSlotsUnderSalaryCap,
} from "./draft";
import { createSeededRandom } from "./seededRandom";
import { RANKED_SALARY_CAP } from "./salaryCap";
import type { DraftSlotConstraint, Player } from "./types";

export type EventRestrictionId = "u25" | "intl";

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
export const EVENT_MAX_MATCHES = 30;
export const EVENT_LEADERBOARD_LIMIT = 100;

export const EVENT_BADGE_THRESHOLDS: Record<EventBadgeTier, number> = {
  participation: 10,
  bronze: 15,
  silver: 20,
  gold: 25,
};

const INTERNATIONAL_BBR_IDS = new Set(
  (internationalPlayerIds as { playerIds: string[] }).playerIds,
);

const pad2 = (value: number) => String(value).padStart(2, "0");

/** ISO week id like 2026-W30 (UTC). */
export const getIsoWeekId = (date: Date = new Date()): string => {
  const utc = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${pad2(week)}`;
};

export const formatEventWeekLabel = (weekId: string) => {
  const match = /^(\d{4})-W(\d{2})$/.exec(weekId);
  if (!match) {
    return weekId;
  }

  return `Week ${Number(match[2])} · ${match[1]}`;
};

export const isValidEventId = (value: string) =>
  /^\d{4}-W\d{2}-(u25|intl)$/.test(value);

export const getEventRestrictionForWeek = (
  weekId: string,
): EventRestrictionId => {
  const weekNumber = Number(weekId.slice(-2));
  return weekNumber % 2 === 0 ? "u25" : "intl";
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

export const filterPlayersForEventRestriction = (
  players: Player[],
  restriction: EventRestrictionId,
) =>
  players.filter((player) =>
    restriction === "u25"
      ? isUnder25EventPlayer(player)
      : isInternationalEventPlayer(player),
  );

export const getEventRestrictionLabel = (restriction: EventRestrictionId) =>
  restriction === "u25" ? "25 & Under" : "International Only";

export const getEventTitle = (restriction: EventRestrictionId) =>
  restriction === "u25" ? "Rising Stars Gauntlet" : "World Squad Challenge";

export const getEventDescription = (restriction: EventRestrictionId) =>
  restriction === "u25"
    ? "Head-to-head with a shared board. Only players age 25 and under are eligible."
    : "Head-to-head with a shared board. Only international players are eligible.";

export const buildSharedEventDraftSlots = (
  pool: Player[],
  eventId: string,
  salaryCapLimit = EVENT_SALARY_CAP,
): DraftSlotConstraint[] =>
  generateFeasibleDraftSlotsUnderSalaryCap(pool, salaryCapLimit, 5, {
    random: createSeededRandom(`event-slots:${eventId}`),
  });

export const getCurrentWeeklyEvent = (
  players: Player[],
  date: Date = new Date(),
): WeeklyEventDefinition | null => {
  const weekId = getIsoWeekId(date);
  const restriction = getEventRestrictionForWeek(weekId);
  const id = buildEventId(weekId, restriction);
  const pool = filterPlayersForEventRestriction(players, restriction);

  if (pool.length < 25) {
    return null;
  }

  const sharedSlots = buildSharedEventDraftSlots(pool, id);

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
    salaryCapLimit: EVENT_SALARY_CAP,
    maxMatches: EVENT_MAX_MATCHES,
    sharedSlots,
  };
};

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
  const match = /^(\d{4}-W\d{2})-(u25|intl)$/.exec(eventId);

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
