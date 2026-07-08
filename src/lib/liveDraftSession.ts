import { readJson, writeJson } from "./browserStorage";
import type { DraftSlotConstraint } from "./types";

const LIVE_DRAFT_SESSION_KEY = "nba-head-to-head-live-draft-session";

export interface LiveDraftSession {
  matchId: string;
  mode: "classic" | "ranked";
  playerId: string;
  teamName: string;
  teamAccent: string;
  draftSlots: DraftSlotConstraint[];
  lineup: string[];
  draftStep: number;
  opponentTeamName: string;
  opponentElo: number;
  opponentPlayerId: string;
  opponentDraftSlots: DraftSlotConstraint[];
  salaryCapMode: boolean;
  salaryCapLimit?: number;
  phase: "drafting" | "waiting";
  savedAt: string;
}

export const saveLiveDraftSession = (session: LiveDraftSession) => {
  writeJson(LIVE_DRAFT_SESSION_KEY, session);
};

export const loadLiveDraftSession = (): LiveDraftSession | null => {
  const saved = readJson<LiveDraftSession>(LIVE_DRAFT_SESSION_KEY);

  if (
    !saved ||
    typeof saved.matchId !== "string" ||
    !Array.isArray(saved.draftSlots) ||
    !Array.isArray(saved.lineup) ||
    !Array.isArray(saved.opponentDraftSlots)
  ) {
    return null;
  }

  return saved;
};

export const clearLiveDraftSession = () => {
  writeJson(LIVE_DRAFT_SESSION_KEY, null);
};
