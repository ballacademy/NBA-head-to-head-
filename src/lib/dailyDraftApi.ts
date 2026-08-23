import { apiFetch } from "./apiFetch";
import type { DailyDraftScoreEntry } from "./dailyDraftScores";

export interface RemoteDailyDraftScores {
  dateKey: string;
  goalId: string;
  mode?: string;
  values: number[];
  totalDrafters: number;
  entry: DailyDraftScoreEntry | null;
}

const API_BASE = "";

const buildUrl = (path: string) => `${API_BASE}${path}`;

export const fetchRemoteDailyDraftScores = async (params: {
  dateKey: string;
  goalId: string;
  mode?: string;
  playerId?: string;
}): Promise<RemoteDailyDraftScores | null> => {
  const search = new URLSearchParams({
    dateKey: params.dateKey,
    goalId: params.goalId,
  });

  if (params.mode) {
    search.set("mode", params.mode);
  }

  if (params.playerId) {
    search.set("playerId", params.playerId);
  }

  try {
    const response = await apiFetch(`${buildUrl("/api/daily-scores")}?${search.toString()}`, {
      headers: { accept: "application/json" },
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as RemoteDailyDraftScores;
    return payload;
  } catch {
    return null;
  }
};

export const submitRemoteDailyDraftScore = async (params: {
  dateKey: string;
  goalId: string;
  mode?: string;
  playerId: string;
  teamName: string;
  value: number;
  formattedResult: string;
  lineup: string[];
}): Promise<DailyDraftScoreEntry | null> => {
  try {
    const response = await apiFetch(buildUrl("/api/daily-scores"), {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify(params),
    });

    // 409 = already submitted (one attempt); return the stored entry.
    if (!response.ok && response.status !== 409) {
      return null;
    }

    const payload = (await response.json()) as {
      entry?: DailyDraftScoreEntry;
    };

    return payload.entry ?? null;
  } catch {
    return null;
  }
};

export interface RemoteDailyDraftHistoryEntry extends DailyDraftScoreEntry {
  dateKey: string;
}

export interface RemoteDailyDraftPlayerHistory {
  playerId: string;
  entries: RemoteDailyDraftHistoryEntry[];
}

/** Account-gated full Daily history for streak restore across devices. */
export const fetchRemoteDailyDraftPlayerHistory = async (
  playerId: string,
): Promise<RemoteDailyDraftPlayerHistory | null> => {
  try {
    const search = new URLSearchParams({ playerId });
    const response = await apiFetch(
      `${buildUrl("/api/daily-player-history")}?${search.toString()}`,
      { headers: { accept: "application/json" } },
    );

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as Partial<RemoteDailyDraftPlayerHistory>;
    const entries = Array.isArray(payload.entries)
      ? payload.entries.filter(
          (entry): entry is RemoteDailyDraftHistoryEntry =>
            Boolean(
              entry &&
                typeof entry === "object" &&
                typeof entry.dateKey === "string" &&
                typeof entry.playerId === "string" &&
                typeof entry.goalId === "string",
            ),
        )
      : [];

    return {
      playerId: payload.playerId ?? playerId,
      entries,
    };
  } catch {
    return null;
  }
};
