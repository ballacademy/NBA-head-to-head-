import type { DailyDraftScoreEntry } from "./dailyDraftScores";

export interface RemoteDailyDraftScores {
  dateKey: string;
  goalId: string;
  values: number[];
  totalDrafters: number;
  entry: DailyDraftScoreEntry | null;
}

const API_BASE = "";

const buildUrl = (path: string) => `${API_BASE}${path}`;

export const fetchRemoteDailyDraftScores = async (params: {
  dateKey: string;
  goalId: string;
  playerId?: string;
}): Promise<RemoteDailyDraftScores | null> => {
  const search = new URLSearchParams({
    dateKey: params.dateKey,
    goalId: params.goalId,
  });

  if (params.playerId) {
    search.set("playerId", params.playerId);
  }

  try {
    const response = await fetch(`${buildUrl("/api/daily-scores")}?${search.toString()}`, {
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
  playerId: string;
  teamName: string;
  value: number;
  formattedResult: string;
  lineup: string[];
}): Promise<DailyDraftScoreEntry | null> => {
  try {
    const response = await fetch(buildUrl("/api/daily-scores"), {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
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
