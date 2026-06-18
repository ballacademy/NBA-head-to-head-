import {
  autoDraftLineup,
  generateDraftSlots,
  pickBestForSlot,
} from "./draft";
import type { TeamProfile } from "./teamProfile";
import type { Drafter } from "./types";
import { getDailyDraftSetup } from "./dailyDraft";
import { initialDrafterBlueprints } from "../data/drafterBlueprints";
import type { Player } from "./types";

export interface StartDraftOptions {
  isDailyDraft?: boolean;
}

export const PICK_TIME_LIMIT_SECONDS = 20;
export const OPPONENT_PICK_MIN_MS = 3000;
export const OPPONENT_PICK_MAX_MS = 9000;

export const createUserDrafter = (
  team: TeamProfile,
  options: StartDraftOptions = {},
): Drafter => {
  const dailySetup = options.isDailyDraft ? getDailyDraftSetup() : null;

  return {
    id: "user",
    name: team.name,
    city: team.city,
    accent: "#2563eb",
    draftSlots: dailySetup?.slots ?? generateDraftSlots(),
    lineup: [],
    isDailyDraft: Boolean(options.isDailyDraft),
    dailyChallengeTitle: dailySetup?.challenge.title,
  };
};

export const createRandomOpponent = (): Drafter => {
  const blueprint =
    initialDrafterBlueprints[
      Math.floor(Math.random() * initialDrafterBlueprints.length)
    ];
  const draftSlots = generateDraftSlots();

  return {
    id: `opponent-${blueprint.id}-${Date.now()}`,
    name: blueprint.name,
    city: blueprint.city,
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
