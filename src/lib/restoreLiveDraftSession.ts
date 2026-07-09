import { createLiveOpponent, createUserDrafter } from "./match";
import { fetchLiveMatchState } from "./liveMatchmaking";
import { getOrCreatePlayerIdentity } from "./playerIdentity";
import type { Drafter } from "./types";
import {
  clearLiveDraftSession,
  loadLiveDraftSession,
  type LiveDraftSession,
} from "./liveDraftSession";

export interface RestoredLiveDraftState {
  user: Drafter;
  opponent: Drafter;
  draftStep: number;
  phase: "drafting" | "waiting";
  matchId: string;
  opponentComplete: boolean;
}

const buildDraftStateFromSession = (
  session: LiveDraftSession,
  opponentLineup: string[] | null,
): RestoredLiveDraftState => {
  const user = {
    ...createUserDrafter(
      { name: session.teamName },
      session.draftSlots,
      {
        salaryCapMode: session.salaryCapMode,
        salaryCapLimit: session.salaryCapLimit,
      },
    ),
    id: "user",
    accent: session.teamAccent,
    lineup: session.lineup,
  };

  const opponent = {
    ...createLiveOpponent(
      session.opponentDraftSlots,
      {
        matchId: session.matchId,
        teamName: session.opponentTeamName,
        elo: session.opponentElo,
        playerId: session.opponentPlayerId,
      },
      { salaryCapMode: session.salaryCapMode },
    ),
    lineup: opponentLineup ?? [],
  };

  const opponentComplete = Boolean(opponentLineup && opponentLineup.length === 5);
  const phase = session.phase;

  return {
    user,
    opponent,
    draftStep: session.draftStep,
    phase,
    matchId: session.matchId,
    opponentComplete,
  };
};

export const restoreLiveDraftSession = async (): Promise<RestoredLiveDraftState | null> => {
  const session = loadLiveDraftSession();

  if (!session) {
    return null;
  }

  const playerId = getOrCreatePlayerIdentity().playerId;

  if (session.playerId !== playerId) {
    clearLiveDraftSession();
    return null;
  }

  const remote = await fetchLiveMatchState({
    matchId: session.matchId,
    playerId,
  });

  if (!remote) {
    clearLiveDraftSession();
    return null;
  }

  if (remote.opponentReady && remote.opponentLineup?.length === 5) {
    return {
      ...buildDraftStateFromSession(session, remote.opponentLineup),
      phase: "waiting",
      opponentComplete: true,
    };
  }

  return buildDraftStateFromSession(session, null);
};
