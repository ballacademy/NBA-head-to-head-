import type { NbaPlayerUsageStore } from "./nbaPlayerUsageShared";
import {
  emptyNbaPlayerUsageStore,
  normalizeNbaPlayerUsageStore,
} from "./nbaPlayerUsageShared";

const API_BASE = "";

const buildUrl = (path: string) => `${API_BASE}${path}`;

export interface RemoteNbaPlayerUsagePayload {
  playerId: string;
  usage: NbaPlayerUsageStore;
  updatedAt: string | null;
}

export const fetchRemoteNbaPlayerUsage = async (
  playerId: string,
): Promise<RemoteNbaPlayerUsagePayload | null> => {
  try {
    const search = new URLSearchParams({ playerId });
    const response = await fetch(
      `${buildUrl("/api/nba-player-usage")}?${search.toString()}`,
      { headers: { accept: "application/json" } },
    );

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as Partial<RemoteNbaPlayerUsagePayload>;
    return {
      playerId: payload.playerId ?? playerId,
      usage: normalizeNbaPlayerUsageStore(payload.usage),
      updatedAt:
        typeof payload.updatedAt === "string" ? payload.updatedAt : null,
    };
  } catch {
    return null;
  }
};

export const pushRemoteNbaPlayerUsage = async (params: {
  playerId: string;
  usage: NbaPlayerUsageStore;
}): Promise<RemoteNbaPlayerUsagePayload | null> => {
  try {
    const response = await fetch(buildUrl("/api/nba-player-usage"), {
      method: "PUT",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        playerId: params.playerId,
        usage: params.usage,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as Partial<RemoteNbaPlayerUsagePayload>;
    return {
      playerId: payload.playerId ?? params.playerId,
      usage: normalizeNbaPlayerUsageStore(payload.usage ?? emptyNbaPlayerUsageStore()),
      updatedAt:
        typeof payload.updatedAt === "string" ? payload.updatedAt : null,
    };
  } catch {
    return null;
  }
};
