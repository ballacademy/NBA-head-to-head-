import { apiFetch } from "./apiFetch";
import {
  parseComposerLibraryFile,
  type ComposerLibraryFile,
} from "../instagramComposer/composerLibrary";

const buildUrl = (path: string) => path;

export interface RemoteComposerLibraryPayload {
  playerId: string;
  library: ComposerLibraryFile | null;
  updatedAt: string | null;
}

export const fetchRemoteComposerLibrary = async (
  playerId: string,
): Promise<RemoteComposerLibraryPayload | null> => {
  try {
    const search = new URLSearchParams({ playerId });
    const response = await apiFetch(
      `${buildUrl("/api/composer-library")}?${search.toString()}`,
      { headers: { accept: "application/json" } },
    );
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as Partial<RemoteComposerLibraryPayload>;
    return {
      playerId: payload.playerId ?? playerId,
      library: parseComposerLibraryFile(payload.library),
      updatedAt:
        typeof payload.updatedAt === "string" ? payload.updatedAt : null,
    };
  } catch {
    return null;
  }
};

export const pushRemoteComposerLibrary = async (params: {
  playerId: string;
  library: ComposerLibraryFile;
}): Promise<RemoteComposerLibraryPayload | null> => {
  try {
    const response = await apiFetch(buildUrl("/api/composer-library"), {
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
    const payload = (await response.json()) as Partial<RemoteComposerLibraryPayload>;
    return {
      playerId: payload.playerId ?? params.playerId,
      library: parseComposerLibraryFile(payload.library),
      updatedAt:
        typeof payload.updatedAt === "string" ? payload.updatedAt : null,
    };
  } catch {
    return null;
  }
};
