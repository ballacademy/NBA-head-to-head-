const API_BASE = "";

const buildUrl = (path: string) => `${API_BASE}${path}`;

export interface RemoteAchievementsPayload {
  playerId: string;
  unlockedIds: string[];
  updatedAt: string | null;
}

export const fetchRemoteAchievements = async (
  playerId: string,
): Promise<RemoteAchievementsPayload | null> => {
  try {
    const search = new URLSearchParams({ playerId });
    const response = await fetch(
      `${buildUrl("/api/achievements")}?${search.toString()}`,
      { headers: { accept: "application/json" } },
    );

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as Partial<RemoteAchievementsPayload>;
    return {
      playerId: payload.playerId ?? playerId,
      unlockedIds: Array.isArray(payload.unlockedIds)
        ? payload.unlockedIds.filter(
            (id): id is string => typeof id === "string",
          )
        : [],
      updatedAt:
        typeof payload.updatedAt === "string" ? payload.updatedAt : null,
    };
  } catch {
    return null;
  }
};

export const pushRemoteAchievements = async (params: {
  playerId: string;
  unlockedIds: string[];
}): Promise<RemoteAchievementsPayload | null> => {
  try {
    const response = await fetch(buildUrl("/api/achievements"), {
      method: "PUT",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        playerId: params.playerId,
        unlockedIds: params.unlockedIds,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as Partial<RemoteAchievementsPayload>;
    return {
      playerId: payload.playerId ?? params.playerId,
      unlockedIds: Array.isArray(payload.unlockedIds)
        ? payload.unlockedIds.filter(
            (id): id is string => typeof id === "string",
          )
        : [],
      updatedAt:
        typeof payload.updatedAt === "string" ? payload.updatedAt : null,
    };
  } catch {
    return null;
  }
};
