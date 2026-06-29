import {
  autoDraftLineup,
  generateFeasibleDraftSlots,
  pickBestForSlot,
} from "./draft";
import { pickOpponentElo, RANKED_STARTING_ELO } from "./rankedElo";
import {
  ensureNpcOpponentPool,
  findRankedOpponentFromLeaderboard,
} from "./rankedLeaderboard";
import { ensureCurrentRankedSeason } from "./rankedProfile";
import type { GhostOpponentSnapshot } from "./ghostMatchmaking";
import type { LiveOpponentSnapshot } from "./liveMatchmaking";
import type { TeamProfile } from "./teamProfile";
import {
  CLASSIC_HEAD_TO_HEAD_SALARY_CAP,
  RANKED_SALARY_CAP,
} from "./salaryCap";
import type { Drafter, DraftSlotConstraint } from "./types";
import { initialDrafterBlueprints } from "../data/drafterBlueprints";
import type { Player } from "./types";

export interface StartDraftOptions {
  isDailyDraft?: boolean;
  dailyChallengeTitle?: string;
  salaryCapMode?: boolean;
  salaryCapLimit?: number;
  allTimeMode?: boolean;
  practiceMode?: boolean;
}

export const PICK_TIME_LIMIT_SECONDS = 20;
export const CLASSIC_PICK_TIME_LIMIT_SECONDS = 30;
export const DAILY_PICK_TIME_LIMIT_SECONDS = 45;

export const getPickTimeLimitSeconds = (
  isDailyDraft = false,
  salaryCapMode = false,
) => {
  if (isDailyDraft) {
    return DAILY_PICK_TIME_LIMIT_SECONDS;
  }

  if (salaryCapMode) {
    return PICK_TIME_LIMIT_SECONDS;
  }

  return CLASSIC_PICK_TIME_LIMIT_SECONDS;
};
export const OPPONENT_PICK_MIN_MS = 3000;
export const OPPONENT_PICK_MAX_MS = 9000;

export const createUserDrafter = (
  team: TeamProfile,
  draftSlots: DraftSlotConstraint[],
  options: StartDraftOptions = {},
): Drafter => {
  const salaryCapMode = Boolean(options.salaryCapMode);
  const allTimeMode = Boolean(options.allTimeMode);
  const practiceMode = Boolean(options.practiceMode);
  const isDailyDraft = Boolean(options.isDailyDraft);
  const salaryCapLimit =
    options.salaryCapLimit ??
    (isDailyDraft || allTimeMode
      ? undefined
      : salaryCapMode
        ? RANKED_SALARY_CAP
        : CLASSIC_HEAD_TO_HEAD_SALARY_CAP);

  return {
    id: "user",
    name: team.name,
    accent: "#2563eb",
    draftSlots,
    lineup: [],
    isDailyDraft,
    dailyChallengeTitle: options.dailyChallengeTitle,
    salaryCapMode,
    salaryCapLimit,
    allTimeMode,
    practiceMode,
  };
};

export const createOpponentDraftSlots = (players: Player[]) =>
  generateFeasibleDraftSlots(players);

export const createRandomOpponent = (
  draftSlots: DraftSlotConstraint[],
): Drafter => {
  const blueprint =
    initialDrafterBlueprints[
      Math.floor(Math.random() * initialDrafterBlueprints.length)
    ];

  return {
    id: `opponent-${blueprint.id}-${Date.now()}`,
    name: blueprint.name,
    accent: blueprint.accent,
    draftSlots,
    lineup: [],
  };
};

export const createClassicOpponent = (
  draftSlots: DraftSlotConstraint[],
  options: { salaryCapLimit?: number } = {},
): Drafter => {
  const opponentElo = pickOpponentElo(RANKED_STARTING_ELO);
  const blueprint =
    initialDrafterBlueprints[
      Math.floor(Math.random() * initialDrafterBlueprints.length)
    ];

  return {
    id: `opponent-${blueprint.id}-${Date.now()}`,
    name: blueprint.name,
    accent: blueprint.accent,
    draftSlots,
    lineup: [],
    salaryCapLimit:
      options.salaryCapLimit ?? CLASSIC_HEAD_TO_HEAD_SALARY_CAP,
    classicOpponentElo: opponentElo,
  };
};

export const createRankedOpponent = (
  draftSlots: DraftSlotConstraint[],
): Drafter => {
  ensureNpcOpponentPool();
  const playerElo = ensureCurrentRankedSeason().elo;
  const targetElo = pickOpponentElo(playerElo);
  const matchedNpc = findRankedOpponentFromLeaderboard(targetElo);
  const blueprint =
    initialDrafterBlueprints[
      Math.floor(Math.random() * initialDrafterBlueprints.length)
    ];
  const opponentElo = matchedNpc?.elo ?? targetElo;

  return {
    id: matchedNpc?.playerId ?? `opponent-${blueprint.id}-${Date.now()}`,
    name: matchedNpc?.name ?? blueprint.name,
    accent: blueprint.accent,
    draftSlots,
    lineup: [],
    salaryCapMode: true,
    salaryCapLimit: RANKED_SALARY_CAP,
    rankedOpponentElo: opponentElo,
  };
};

export const createGhostOpponent = (
  draftSlots: DraftSlotConstraint[],
  ghost: GhostOpponentSnapshot,
  options: { salaryCapMode?: boolean } = {},
): Drafter => {
  const blueprint =
    initialDrafterBlueprints[
      Math.abs(ghost.teamName.length) % initialDrafterBlueprints.length
    ]!;
  const storedLineup = ghost.lineup.filter((playerId): playerId is string =>
    Boolean(playerId),
  );

  return {
    id: `ghost-${ghost.id}`,
    name: ghost.teamName,
    accent: blueprint.accent,
    draftSlots,
    lineup: storedLineup,
    salaryCapMode: options.salaryCapMode,
    salaryCapLimit: options.salaryCapMode
      ? RANKED_SALARY_CAP
      : CLASSIC_HEAD_TO_HEAD_SALARY_CAP,
    rankedOpponentElo: options.salaryCapMode ? ghost.elo : undefined,
    classicOpponentElo: options.salaryCapMode ? undefined : ghost.elo,
    isGhostOpponent: true,
  };
};

export const createLiveOpponent = (
  draftSlots: DraftSlotConstraint[],
  live: LiveOpponentSnapshot,
  options: { salaryCapMode?: boolean } = {},
): Drafter => {
  const blueprint =
    initialDrafterBlueprints[
      Math.abs(live.teamName.length) % initialDrafterBlueprints.length
    ]!;

  return {
    id: `live-${live.matchId}`,
    name: live.teamName,
    accent: blueprint.accent,
    draftSlots,
    lineup: [],
    isLiveOpponent: true,
    liveMatchId: live.matchId,
    salaryCapMode: options.salaryCapMode,
    salaryCapLimit: options.salaryCapMode
      ? RANKED_SALARY_CAP
      : CLASSIC_HEAD_TO_HEAD_SALARY_CAP,
    rankedOpponentElo: options.salaryCapMode ? live.elo : undefined,
    classicOpponentElo: options.salaryCapMode ? undefined : live.elo,
  };
};

export const finalizeOpponentLineup = (
  players: Player[],
  opponent: Drafter,
): Drafter => ({
  ...opponent,
  lineup: autoDraftLineup(players, opponent.draftSlots),
});

export const getOpponentPickDelayMs = () =>
  OPPONENT_PICK_MIN_MS +
  Math.floor(Math.random() * (OPPONENT_PICK_MAX_MS - OPPONENT_PICK_MIN_MS));

export const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });

export { pickBestForSlot };
