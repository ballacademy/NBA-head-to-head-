import { evaluateEventBadges } from "./weeklyEvents";
import type { EventProfile } from "./eventProfile";

export interface EventProfilesPayload {
  byEventId: Record<string, EventProfile>;
}

const EVENT_STARTING_ELO = 1000;

const asNonNegInt = (value: unknown) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.round(value));
};

export const emptyEventProfilesPayload = (): EventProfilesPayload => ({
  byEventId: {},
});

export const normalizeEventProfile = (
  eventId: string,
  raw: unknown,
): EventProfile => {
  const saved =
    raw && typeof raw === "object" ? (raw as Partial<EventProfile>) : {};
  const wins = asNonNegInt(saved.wins);
  const losses = asNonNegInt(saved.losses);
  const ties = asNonNegInt(saved.ties);
  const matchesPlayed = Math.max(
    asNonNegInt(saved.matchesPlayed),
    wins + losses + ties,
  );

  return {
    eventId,
    wins,
    losses,
    ties,
    matchesPlayed,
    winStreak: asNonNegInt(saved.winStreak),
    lossStreak: asNonNegInt(saved.lossStreak),
    elo: Math.max(100, asNonNegInt(saved.elo) || EVENT_STARTING_ELO),
    badges: evaluateEventBadges({ matchesPlayed, wins }),
  };
};

export const normalizeEventProfilesPayload = (
  raw: unknown,
): EventProfilesPayload => {
  if (!raw || typeof raw !== "object") {
    return emptyEventProfilesPayload();
  }

  const row = raw as Partial<EventProfilesPayload> & {
    byEventId?: Record<string, unknown>;
  };
  const byEventId: Record<string, EventProfile> = {};

  for (const [eventId, profile] of Object.entries(row.byEventId ?? {})) {
    if (!eventId) {
      continue;
    }
    byEventId[eventId] = normalizeEventProfile(eventId, profile);
  }

  return { byEventId };
};

export const parseEventProfilesJson = (raw: string): EventProfilesPayload => {
  try {
    return normalizeEventProfilesPayload(JSON.parse(raw) as unknown);
  } catch {
    return emptyEventProfilesPayload();
  }
};

/**
 * Pick one whole event record — never Math.max wins/losses independently
 * (that invents matches that never happened across devices).
 */
const mergeProfile = (left: EventProfile, right: EventProfile): EventProfile => {
  const a = normalizeEventProfile(left.eventId, left);
  const b = normalizeEventProfile(right.eventId || left.eventId, right);

  if (a.matchesPlayed !== b.matchesPlayed) {
    return a.matchesPlayed > b.matchesPlayed ? a : b;
  }

  if (a.wins === b.wins && a.losses === b.losses && a.ties === b.ties) {
    return normalizeEventProfile(a.eventId, {
      ...a,
      winStreak: Math.max(a.winStreak, b.winStreak),
      lossStreak: Math.max(a.lossStreak, b.lossStreak),
      elo: Math.max(a.elo, b.elo),
    });
  }

  if (a.wins !== b.wins) {
    return a.wins > b.wins ? a : b;
  }

  return a;
};

/** Monotonic merge safe for cross-device sync. */
export const mergeEventProfilesPayload = (
  ...payloads: EventProfilesPayload[]
): EventProfilesPayload => {
  const next = emptyEventProfilesPayload();

  for (const payload of payloads) {
    for (const [eventId, profile] of Object.entries(
      normalizeEventProfilesPayload(payload).byEventId,
    )) {
      next.byEventId[eventId] = next.byEventId[eventId]
        ? mergeProfile(next.byEventId[eventId], profile)
        : profile;
    }
  }

  return next;
};
