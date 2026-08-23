import { apiFetch } from "./apiFetch";
import type { TierListAccountPayload } from "./tierListLibraryShared";
import {
  emptyTierListAccountPayload,
  normalizeTierListAccountPayload,
} from "./tierListLibraryShared";

const API_BASE = "";

const buildUrl = (path: string) => `${API_BASE}${path}`;

export interface RemoteTierListLibraryPayload {
  playerId: string;
  library: TierListAccountPayload;
  updatedAt: string | null;
}

export const fetchRemoteTierListLibrary = async (
  playerId: string,
): Promise<RemoteTierListLibraryPayload | null> => {
  try {
    const search = new URLSearchParams({ playerId });
    const response = await apiFetch(
      `${buildUrl("/api/tier-list-library")}?${search.toString()}`,
      { headers: { accept: "application/json" } },
    );

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as Partial<RemoteTierListLibraryPayload>;
    return {
      playerId: payload.playerId ?? playerId,
      library: normalizeTierListAccountPayload(payload.library),
      updatedAt:
        typeof payload.updatedAt === "string" ? payload.updatedAt : null,
    };
  } catch {
    return null;
  }
};

export const pushRemoteTierListLibrary = async (params: {
  playerId: string;
  library: TierListAccountPayload;
}): Promise<RemoteTierListLibraryPayload | null> => {
  try {
    const response = await apiFetch(buildUrl("/api/tier-list-library"), {
      method: "PUT",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        playerId: params.playerId,
        library: params.library,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as Partial<RemoteTierListLibraryPayload>;
    return {
      playerId: payload.playerId ?? params.playerId,
      library: normalizeTierListAccountPayload(
        payload.library ?? emptyTierListAccountPayload(),
      ),
      updatedAt:
        typeof payload.updatedAt === "string" ? payload.updatedAt : null,
    };
  } catch {
    return null;
  }
};
