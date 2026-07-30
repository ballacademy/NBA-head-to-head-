export interface RemotePlayerLegacyProfile {
  playerId: string;
  peakElo: number;
  peakEloSeasonId: string;
  bestMonthlyRank: number | null;
  bestMonthlyRankSeasonId: string;
  updatedAt: string;
}

export interface RemotePlayerProfileResponse {
  playerId: string;
  username?: string;
  legacy: RemotePlayerLegacyProfile | null;
  currentSeason?: {
    seasonId: string;
    mode?: "classic" | "ranked";
    elo: number;
    rank: number | null;
    wins: number;
    losses: number;
    winStreak?: number;
    lossStreak?: number;
    teamName: string;
    publicTag: string;
    username?: string;
  };
}

const API_BASE = "";

export const fetchRemotePlayerProfile = async (params: {
  playerId: string;
  seasonId?: string;
  mode?: "classic" | "ranked";
}): Promise<RemotePlayerProfileResponse | null> => {
  const search = new URLSearchParams({
    playerId: params.playerId,
  });

  if (params.seasonId) {
    search.set("seasonId", params.seasonId);
  }

  if (params.mode) {
    search.set("mode", params.mode);
  }

  try {
    const response = await fetch(`${API_BASE}/api/player-profile?${search.toString()}`, {
      headers: { accept: "application/json" },
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as RemotePlayerProfileResponse;
  } catch {
    return null;
  }
};
