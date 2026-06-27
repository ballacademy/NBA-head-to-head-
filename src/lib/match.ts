import {
  autoDraftLineup,
  generateFeasibleDraftSlots,
  pickBestForSlot,
} from "./draft";
import { ensureClassicProfile } from "./classicProfile";
import { pickOpponentElo } from "./rankedElo";
import {
  ensureRankedLeaderboard,
  findRankedOpponentFromLeaderboard,
} from "./rankedLeaderboard";
import { ensureCurrentRankedSeason } from "./rankedProfile";
import type { GhostOpponentSnapshot } from "./ghostMatchmaking";
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
}

export const PICK_TIME_LIMIT_SECONDS = 20;
export const OPPONENT_PICK_MIN_MS = 3000;
export const OPPONENT_PICK_MAX_MS = 9000;

export const createUserDrafter = (
  team: TeamProfile,
  draftSlots: DraftSlotConstraint[],
  options: StartDraftOptions = {},
): Drafter => {
  const salaryCapMode = Boolean(options.salaryCapMode);
  const allTimeMode = Boolean(options.allTimeMode);
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
): Drafter => {
  const playerElo = ensureClassicProfile().elo;
  const opponentElo = pickOpponentElo(playerElo);
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
    salaryCapLimit: CLASSIC_HEAD_TO_HEAD_SALARY_CAP,
    classicOpponentElo: opponentElo,
  };
};

export const createRankedOpponent = (
  draftSlots: DraftSlotConstraint[],
): Drafter => {
  ensureRankedLeaderboard();
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

  return {
    id: `ghost-${ghost.id}`,
    name: ghost.teamName,
    accent: blueprint.accent,
    draftSlots,
    lineup: ghost.lineup,
    salaryCapMode: options.salaryCapMode,
    salaryCapLimit: options.salaryCapMode
      ? RANKED_SALARY_CAP
      : CLASSIC_HEAD_TO_HEAD_SALARY_CAP,
    rankedOpponentElo: options.salaryCapMode ? ghost.elo : undefined,
    classicOpponentElo: options.salaryCapMode ? undefined : ghost.elo,
    isGhostOpponent: true,
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
