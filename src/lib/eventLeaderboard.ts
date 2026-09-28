import { formatUsername } from "./accountCredentials";
import { apiFetch } from "./apiFetch";
import { getOrCreatePlayerIdentity } from "./playerIdentity";
import { isPlayerAccountLinked } from "./accountGate";
import type { EventProfile } from "./eventProfile";
import {
  EVENT_LEADERBOARD_LIMIT,
  type WeeklyEventDefinition,
} from "./weeklyEvents";

export interface EventLeaderboardEntry {
  rank: number;
  playerId: string;
  teamName: string;
  /** Linked account handle when present (preferred display label). */
  username?: string;
  publicTag: string;
  wins: number;
  losses: number;
  matchesPlayed: number;
  isViewer?: boolean;
}

/** Shape returned by `/api/leaderboards` (plus legacy aliases). */
interface RemoteLeaderboardEntry {
  playerId?: string;
  /** Current API field for team name. */
  name?: string;
  /** Legacy/client-only alias — not sent by the API today. */
  teamName?: string;
  username?: string;
  publicTag?: string;
  wins?: number;
  losses?: number;
  /** Current API field for the viewer row. */
  isYou?: boolean;
  /** Legacy alias. */
  isViewer?: boolean;
}

const API_BASE = "";

const buildUrl = (path: string) => `${API_BASE}${path}`;

/** Normalize a raw `/api/leaderboards` event row for the Events standings UI. */
export const mapEventLeaderboardEntry = (
  entry: RemoteLeaderboardEntry,
  rank: number,
): EventLeaderboardEntry => {
  const teamName = entry.name?.trim() || entry.teamName?.trim() || "";
  const username = entry.username?.trim() || undefined;

  return {
    rank,
    playerId: entry.playerId ?? "",
    teamName: teamName || "Unknown",
    username,
    publicTag: entry.publicTag ?? "",
    wins: entry.wins ?? 0,
    losses: entry.losses ?? 0,
    matchesPlayed: (entry.wins ?? 0) + (entry.losses ?? 0),
    isViewer: Boolean(entry.isYou ?? entry.isViewer),
  };
};

/** Preferred standings label: @username when linked, else team name. */
export const formatEventLeaderboardLabel = (entry: {
  teamName: string;
  username?: string;
}) => {
  const username = entry.username?.trim();
  if (username) {
    return formatUsername(username);
  }
  return entry.teamName?.trim() || "Unknown";
};

export const submitEventLeaderboardEntry = async (params: {
  event: WeeklyEventDefinition;
  teamName: string;
  profile: EventProfile;
}): Promise<boolean> => {
  const identity = getOrCreatePlayerIdentity();

  if (!(await isPlayerAccountLinked(identity.playerId))) {
    return false;
  }

  try {
    const response = await apiFetch(buildUrl("/api/leaderboards"), {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        mode: "event",
        seasonId: params.event.id,
        playerId: identity.playerId,
        teamName: params.teamName,
        publicTag: identity.publicTag,
        elo: params.profile.elo,
        wins: params.profile.wins,
        losses: params.profile.losses,
        winStreak: params.profile.winStreak,
        lossStreak: params.profile.lossStreak,
      }),
    });

    return response.ok;
  } catch {
    return false;
  }
};

export const fetchEventLeaderboard = async (
  eventId: string,
): Promise<EventLeaderboardEntry[] | null> => {
  const identity = getOrCreatePlayerIdentity();
  const search = new URLSearchParams({
    mode: "event",
    seasonId: eventId,
    sort: "wins",
    limit: String(EVENT_LEADERBOARD_LIMIT),
    viewerPlayerId: identity.playerId,
  });

  try {
    const response = await apiFetch(
      buildUrl(`/api/leaderboards?${search.toString()}`),
      {
        headers: { accept: "application/json" },
      },
    );

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      entries?: RemoteLeaderboardEntry[];
    };

    return (payload.entries ?? []).map((entry, index) =>
      mapEventLeaderboardEntry(entry, index + 1),
    );
  } catch {
    return null;
  }
};
