import { apiFetch } from "./apiFetch";
import type { CareerStatsPayload } from "./careerStatsShared";
import {
  emptyCareerStats,
  normalizeCareerStats,
} from "./careerStatsShared";

const API_BASE = "";

const buildUrl = (path: string) => `${API_BASE}${path}`;

export interface RemoteCareerStatsPayload {
  playerId: string;
  career: CareerStatsPayload;
  updatedAt: string | null;
}

export const fetchRemoteCareerStats = async (
  playerId: string,
): Promise<RemoteCareerStatsPayload | null> => {
  try {
    const search = new URLSearchParams({ playerId });
    const response = await apiFetch(
      `${buildUrl("/api/career-stats")}?${search.toString()}`,
      { headers: { accept: "application/json" } },
    );

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as Partial<RemoteCareerStatsPayload>;
    return {
      playerId: payload.playerId ?? playerId,
      career: normalizeCareerStats(payload.career),
      updatedAt:
        typeof payload.updatedAt === "string" ? payload.updatedAt : null,
    };
  } catch {
    return null;
  }
};

export const pushRemoteCareerStats = async (params: {
  playerId: string;
  career: CareerStatsPayload;
}): Promise<RemoteCareerStatsPayload | null> => {
  try {
    const response = await apiFetch(buildUrl("/api/career-stats"), {
      method: "PUT",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        playerId: params.playerId,
        career: params.career,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as Partial<RemoteCareerStatsPayload>;
    return {
      playerId: payload.playerId ?? params.playerId,
      career: normalizeCareerStats(payload.career ?? emptyCareerStats()),
      updatedAt:
        typeof payload.updatedAt === "string" ? payload.updatedAt : null,
    };
  } catch {
    return null;
  }
};
