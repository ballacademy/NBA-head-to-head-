export type LeaderboardMode = "classic" | "ranked";
export type LeaderboardSort = "elo" | "winStreak" | "lossStreak";

export interface RemoteLeaderboardEntry {
  playerId: string;
  isYou?: boolean;
  name: string;
  publicTag: string;
  elo: number;
  wins: number;
  losses: number;
  winStreak: number;
  lossStreak: number;
  updatedAt: string;
}

export interface RemoteLeaderboardResponse {
  mode: LeaderboardMode;
  seasonId: string;
  sort: LeaderboardSort;
  entries: RemoteLeaderboardEntry[];
}

const API_BASE = "";

const buildUrl = (path: string) => `${API_BASE}${path}`;

export const fetchRemoteLeaderboard = async (params: {
  mode: LeaderboardMode;
  seasonId?: string;
  sort: LeaderboardSort;
  limit?: number;
  viewerPlayerId?: string;
}): Promise<RemoteLeaderboardResponse | null> => {
  const search = new URLSearchParams({
    mode: params.mode,
    sort: params.sort,
  });

  if (params.mode === "ranked" && params.seasonId) {
    search.set("seasonId", params.seasonId);
  }

  if (params.limit != null) {
    search.set("limit", String(params.limit));
  }

  if (params.viewerPlayerId) {
    search.set("viewerPlayerId", params.viewerPlayerId);
  }

  try {
    const response = await fetch(`${buildUrl("/api/leaderboards")}?${search.toString()}`, {
      headers: { accept: "application/json" },
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as RemoteLeaderboardResponse;
  } catch {
    return null;
  }
};

export const submitRemoteLeaderboardEntry = async (params: {
  mode: LeaderboardMode;
  seasonId?: string;
  playerId: string;
  teamName: string;
  publicTag: string;
  elo: number;
  wins: number;
  losses: number;
  winStreak: number;
  lossStreak: number;
}): Promise<RemoteLeaderboardEntry | null> => {
  try {
    const response = await fetch(buildUrl("/api/leaderboards"), {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        mode: params.mode,
        seasonId: params.mode === "ranked" ? params.seasonId : "",
        playerId: params.playerId,
        teamName: params.teamName,
        publicTag: params.publicTag,
        elo: params.elo,
        wins: params.wins,
        losses: params.losses,
        winStreak: params.winStreak,
        lossStreak: params.lossStreak,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      entry?: RemoteLeaderboardEntry;
    };

    return payload.entry ?? null;
  } catch {
    return null;
  }
};
