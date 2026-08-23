import { apiFetch } from "./apiFetch";
const API_BASE = "";

const buildUrl = (path: string) => `${API_BASE}${path}`;

export interface RemoteCollectionPayload {
  playerId: string;
  unlockedIds: string[];
  updatedAt: string | null;
}

export const fetchRemoteCollection = async (
  playerId: string,
): Promise<RemoteCollectionPayload | null> => {
  try {
    const search = new URLSearchParams({ playerId });
    const response = await apiFetch(
      `${buildUrl("/api/collection")}?${search.toString()}`,
      { headers: { accept: "application/json" } },
    );

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as Partial<RemoteCollectionPayload>;
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

export const pushRemoteCollection = async (params: {
  playerId: string;
  unlockedIds: string[];
}): Promise<RemoteCollectionPayload | null> => {
  try {
    const response = await apiFetch(buildUrl("/api/collection"), {
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

    const payload = (await response.json()) as Partial<RemoteCollectionPayload>;
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
