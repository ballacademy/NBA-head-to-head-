import type { EventProfilesPayload } from "./eventProfileShared";
import {
  emptyEventProfilesPayload,
  normalizeEventProfilesPayload,
} from "./eventProfileShared";

const API_BASE = "";

const buildUrl = (path: string) => `${API_BASE}${path}`;

export interface RemoteEventProfilesPayload {
  playerId: string;
  profiles: EventProfilesPayload;
  updatedAt: string | null;
}

export const fetchRemoteEventProfiles = async (
  playerId: string,
): Promise<RemoteEventProfilesPayload | null> => {
  try {
    const search = new URLSearchParams({ playerId });
    const response = await fetch(
      `${buildUrl("/api/event-profiles")}?${search.toString()}`,
      { headers: { accept: "application/json" } },
    );

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as Partial<RemoteEventProfilesPayload>;
    return {
      playerId: payload.playerId ?? playerId,
      profiles: normalizeEventProfilesPayload(payload.profiles),
      updatedAt:
        typeof payload.updatedAt === "string" ? payload.updatedAt : null,
    };
  } catch {
    return null;
  }
};

export const pushRemoteEventProfiles = async (params: {
  playerId: string;
  profiles: EventProfilesPayload;
}): Promise<RemoteEventProfilesPayload | null> => {
  try {
    const response = await fetch(buildUrl("/api/event-profiles"), {
      method: "PUT",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        playerId: params.playerId,
        profiles: params.profiles,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as Partial<RemoteEventProfilesPayload>;
    return {
      playerId: payload.playerId ?? params.playerId,
      profiles: normalizeEventProfilesPayload(
        payload.profiles ?? emptyEventProfilesPayload(),
      ),
      updatedAt:
        typeof payload.updatedAt === "string" ? payload.updatedAt : null,
    };
  } catch {
    return null;
  }
};
