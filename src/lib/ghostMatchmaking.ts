export type GhostMatchmakingMode = "classic" | "ranked";

export interface GhostOpponentSnapshot {
  id: string;
  teamName: string;
  lineup: string[];
  elo: number;
  createdAt: string;
}

export interface StoredLineupSubmission {
  mode: GhostMatchmakingMode;
  playerId: string;
  teamName: string;
  lineup: string[];
  elo: number;
}

const API_BASE = "";

const buildUrl = (path: string) => `${API_BASE}${path}`;

const buildOpponentPath = (params: {
  mode: GhostMatchmakingMode;
  playerId: string;
  elo: number;
}) => {
  const search = new URLSearchParams({
    mode: params.mode,
    playerId: params.playerId,
    elo: String(Math.round(params.elo)),
  });

  return `${buildUrl("/api/opponent")}?${search.toString()}`;
};

export const fetchGhostOpponent = async (params: {
  mode: GhostMatchmakingMode;
  playerId: string;
  elo: number;
}): Promise<GhostOpponentSnapshot | null> => {
  try {
    const response = await fetch(buildOpponentPath(params), {
      headers: { accept: "application/json" },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as GhostOpponentSnapshot;
  } catch {
    return null;
  }
};

export const submitStoredLineup = async (
  submission: StoredLineupSubmission,
): Promise<boolean> => {
  try {
    const response = await fetch(buildUrl("/api/lineups"), {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify(submission),
    });

    return response.ok;
  } catch {
    return false;
  }
};
