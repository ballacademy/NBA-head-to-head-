import { readJson, writeJson } from "./browserStorage";
import type { HeadToHeadResult } from "./playerRecord";
import type { EventProfilesPayload } from "./eventProfileShared";
import { normalizeEventProfilesPayload } from "./eventProfileShared";
import {
  evaluateEventBadges,
  EVENT_MAX_MATCHES,
  type EventBadgeTier,
} from "./weeklyEvents";

const EVENT_PROFILES_KEY = "nba-head-to-head-event-profiles";
const EVENT_STARTING_ELO = 1000;

export interface EventProfile {
  eventId: string;
  wins: number;
  losses: number;
  ties: number;
  matchesPlayed: number;
  winStreak: number;
  lossStreak: number;
  elo: number;
  badges: EventBadgeTier[];
}

interface StoredEventProfiles {
  byEventId?: Record<string, Partial<EventProfile>>;
}

const emptyProfile = (eventId: string): EventProfile => ({
  eventId,
  wins: 0,
  losses: 0,
  ties: 0,
  matchesPlayed: 0,
  winStreak: 0,
  lossStreak: 0,
  elo: EVENT_STARTING_ELO,
  badges: [],
});

const normalizeProfile = (
  eventId: string,
  saved?: Partial<EventProfile>,
): EventProfile => {
  const wins = saved?.wins ?? 0;
  const losses = saved?.losses ?? 0;
  const ties = saved?.ties ?? 0;
  const matchesPlayed =
    saved?.matchesPlayed ?? wins + losses + ties;
  const badges = evaluateEventBadges({ matchesPlayed, wins });

  return {
    eventId,
    wins,
    losses,
    ties,
    matchesPlayed,
    winStreak: saved?.winStreak ?? 0,
    lossStreak: saved?.lossStreak ?? 0,
    elo: saved?.elo ?? EVENT_STARTING_ELO,
    badges,
  };
};

const loadAllProfiles = (): Record<string, EventProfile> => {
  const saved = readJson<StoredEventProfiles>(EVENT_PROFILES_KEY);
  const byEventId = saved?.byEventId ?? {};
  const next: Record<string, EventProfile> = {};

  for (const [eventId, profile] of Object.entries(byEventId)) {
    next[eventId] = normalizeProfile(eventId, profile);
  }

  return next;
};

const saveAllProfiles = (profiles: Record<string, EventProfile>) => {
  writeJson(EVENT_PROFILES_KEY, { byEventId: profiles });
};

const pushEventProfilesIfLinked = () => {
  void import("./eventProfileRemote")
    .then(({ pushEventProfilesIfLinked }) => pushEventProfilesIfLinked())
    .catch(() => undefined);
};

export const loadEventProfilesPayload = (): EventProfilesPayload =>
  normalizeEventProfilesPayload({ byEventId: loadAllProfiles() });

export const saveEventProfilesPayload = (payload: EventProfilesPayload) => {
  const normalized = normalizeEventProfilesPayload(payload);
  saveAllProfiles(normalized.byEventId);
};

export const loadEventProfile = (eventId: string): EventProfile => {
  const profiles = loadAllProfiles();
  return profiles[eventId] ?? emptyProfile(eventId);
};

export const loadAllEventProfiles = (): EventProfile[] =>
  Object.values(loadAllProfiles()).sort((left, right) =>
    right.eventId.localeCompare(left.eventId),
  );

export const canPlayEventMatch = (eventId: string) =>
  loadEventProfile(eventId).matchesPlayed < EVENT_MAX_MATCHES;

export const remainingEventMatches = (eventId: string) =>
  Math.max(0, EVENT_MAX_MATCHES - loadEventProfile(eventId).matchesPlayed);

const applyResult = (
  profile: EventProfile,
  result: HeadToHeadResult,
): EventProfile => {
  const wins = profile.wins + (result === "win" ? 1 : 0);
  const losses = profile.losses + (result === "loss" ? 1 : 0);
  const ties = profile.ties + (result === "tie" ? 1 : 0);
  const matchesPlayed = profile.matchesPlayed + 1;
  const winStreak =
    result === "win"
      ? profile.winStreak + 1
      : result === "loss"
        ? 0
        : profile.winStreak;
  const lossStreak =
    result === "loss"
      ? profile.lossStreak + 1
      : result === "win"
        ? 0
        : profile.lossStreak;
  // Ties do not move Elo so leaderboard upserts stay match-linked.
  const eloDelta = result === "win" ? 16 : result === "loss" ? -12 : 0;

  return {
    ...profile,
    wins,
    losses,
    ties,
    matchesPlayed,
    winStreak,
    lossStreak,
    elo: Math.max(100, profile.elo + eloDelta),
    badges: evaluateEventBadges({ matchesPlayed, wins }),
  };
};

export const persistEventMatchOutcome = (
  eventId: string,
  result: HeadToHeadResult,
  matchId: string,
): EventProfile => {
  const lastKey = `${EVENT_PROFILES_KEY}:last-match`;
  const last = readJson<{ matchId?: string; eventId?: string }>(lastKey);

  if (last?.matchId === matchId && last.eventId === eventId) {
    return loadEventProfile(eventId);
  }

  const profiles = loadAllProfiles();
  const next = applyResult(profiles[eventId] ?? emptyProfile(eventId), result);
  profiles[eventId] = next;
  saveAllProfiles(profiles);
  writeJson(lastKey, { matchId, eventId });
  pushEventProfilesIfLinked();
  return next;
};
