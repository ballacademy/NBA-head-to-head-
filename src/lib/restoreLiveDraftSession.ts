import { createLiveOpponent, createUserDrafter } from "./match";
import { fetchLiveMatchStateDetailed } from "./liveMatchmaking";
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
  opponentAutoDrafted?: boolean;
}

export type RestoreLiveDraftResult =
  | { status: "restored"; state: RestoredLiveDraftState }
  | { status: "unavailable" }
  | { status: "none" };

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const buildDraftStateFromSession = (
  session: LiveDraftSession,
  opponentLineup: string[] | null,
  selfLineup?: string[] | null,
): RestoredLiveDraftState => {
  const restoredSelfLineup =
    selfLineup && selfLineup.length === 5 ? selfLineup : session.lineup;

  const user = {
    ...createUserDrafter(
      { name: session.teamName },
      session.draftSlots,
      {
        salaryCapMode: session.salaryCapMode,
        salaryCapLimit: session.salaryCapLimit,
        privateMatch: session.privateMatch,
        eventId: session.eventId,
        eventRestriction: session.eventRestriction,
      },
    ),
    id: "user",
    accent: session.teamAccent,
    lineup: restoredSelfLineup,
  };

  const opponent = {
    ...createLiveOpponent(
      session.opponentDraftSlots,
      {
        matchId: session.matchId,
        teamName: session.opponentTeamName,
        elo: session.opponentElo,
        playerId: session.opponentPlayerId,
        username: session.opponentUsername,
      },
      { salaryCapMode: session.salaryCapMode },
    ),
    lineup: opponentLineup ?? [],
    privateMatch: session.privateMatch,
    eventId: session.eventId,
    eventRestriction: session.eventRestriction,
  };

  const opponentComplete = Boolean(opponentLineup && opponentLineup.length === 5);
  const phase = session.phase;

  return {
    user,
    opponent,
    draftStep:
      restoredSelfLineup.length === 5
        ? session.draftSlots.length
        : session.draftStep,
    phase,
    matchId: session.matchId,
    opponentComplete,
  };
};

export const restoreLiveDraftSession = async (): Promise<RestoreLiveDraftResult> => {
  const session = loadLiveDraftSession();

  if (!session) {
    return { status: "none" };
  }

  const playerId = getOrCreatePlayerIdentity().playerId;

  if (session.playerId !== playerId) {
    clearLiveDraftSession();
    return { status: "none" };
  }

  let remote = await fetchLiveMatchStateDetailed({
    matchId: session.matchId,
    playerId,
  });

  // Transient network/5xx — retry before treating the match as gone.
  if (!remote.ok && remote.error === "unavailable") {
    await sleep(750);
    remote = await fetchLiveMatchStateDetailed({
      matchId: session.matchId,
      playerId,
    });
  }

  if (!remote.ok) {
    if (remote.error === "unavailable") {
      // Keep local session so a later refresh can reconnect.
      return { status: "unavailable" };
    }

    clearLiveDraftSession();
    return { status: "none" };
  }

  const state = remote.state;
  const sessionWithMeta: LiveDraftSession = {
    ...session,
    opponentUsername: session.opponentUsername ?? state.opponentUsername,
  };

  if (state.opponentReady && state.opponentLineup?.length === 5) {
    return {
      status: "restored",
      state: {
        ...buildDraftStateFromSession(
          sessionWithMeta,
          state.opponentLineup,
          state.selfLineup,
        ),
        phase: "waiting",
        opponentComplete: true,
      },
    };
  }

  return {
    status: "restored",
    state: buildDraftStateFromSession(
      sessionWithMeta,
      null,
      state.selfLineup,
    ),
  };
};
