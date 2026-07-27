import { getOrCreatePlayerIdentity } from "./playerIdentity";
import type { EventProfile } from "./eventProfile";
import {
  EVENT_LEADERBOARD_LIMIT,
  type WeeklyEventDefinition,
} from "./weeklyEvents";

export interface EventLeaderboardEntry {
  rank: number;
  playerId: string;
  teamName: string;
  publicTag: string;
  wins: number;
  losses: number;
  matchesPlayed: number;
  isViewer?: boolean;
}

interface RemoteLeaderboardEntry {
  playerId?: string;
  teamName?: string;
  publicTag?: string;
  wins?: number;
  losses?: number;
  isViewer?: boolean;
}

const API_BASE = "";

const buildUrl = (path: string) => `${API_BASE}${path}`;

export const submitEventLeaderboardEntry = async (params: {
  event: WeeklyEventDefinition;
  teamName: string;
  profile: EventProfile;
}): Promise<boolean> => {
  const identity = getOrCreatePlayerIdentity();

  try {
    const response = await fetch(buildUrl("/api/leaderboards"), {
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
): Promise<EventLeaderboardEntry[]> => {
  const identity = getOrCreatePlayerIdentity();
  const search = new URLSearchParams({
    mode: "event",
    seasonId: eventId,
    sort: "wins",
    limit: String(EVENT_LEADERBOARD_LIMIT),
    viewerPlayerId: identity.playerId,
  });

  try {
    const response = await fetch(
      buildUrl(`/api/leaderboards?${search.toString()}`),
      {
        headers: { accept: "application/json" },
      },
    );

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as {
      entries?: RemoteLeaderboardEntry[];
    };

    return (payload.entries ?? []).map((entry, index) => ({
      rank: index + 1,
      playerId: entry.playerId ?? "",
      teamName: entry.teamName ?? "Unknown",
      publicTag: entry.publicTag ?? "",
      wins: entry.wins ?? 0,
      losses: entry.losses ?? 0,
      matchesPlayed: (entry.wins ?? 0) + (entry.losses ?? 0),
      isViewer: Boolean(entry.isViewer),
    }));
  } catch {
    return [];
  }
};
