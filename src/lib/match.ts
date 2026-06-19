import {
  autoDraftLineup,
  generateFeasibleDraftSlots,
  pickBestForSlot,
} from "./draft";
import type { TeamProfile } from "./teamProfile";
import type { Drafter, DraftSlotConstraint } from "./types";
import { initialDrafterBlueprints } from "../data/drafterBlueprints";
import type { Player } from "./types";

export interface StartDraftOptions {
  isDailyDraft?: boolean;
  dailyChallengeTitle?: string;
  salaryCapMode?: boolean;
  allTimeMode?: boolean;
}

export const PICK_TIME_LIMIT_SECONDS = 20;
export const OPPONENT_PICK_MIN_MS = 3000;
export const OPPONENT_PICK_MAX_MS = 9000;

export const createUserDrafter = (
  team: TeamProfile,
  draftSlots: DraftSlotConstraint[],
  options: StartDraftOptions = {},
): Drafter => ({
  id: "user",
  name: team.name,
  accent: "#2563eb",
  draftSlots,
  lineup: [],
  isDailyDraft: Boolean(options.isDailyDraft),
  dailyChallengeTitle: options.dailyChallengeTitle,
  salaryCapMode: Boolean(options.salaryCapMode),
  allTimeMode: Boolean(options.allTimeMode),
});

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
