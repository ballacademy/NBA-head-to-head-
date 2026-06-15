import {
  autoDraftLineup,
  generateDraftSlots,
  pickBestForSlot,
} from "./draft";
import type { Drafter } from "./types";
import { initialDrafterBlueprints } from "../data/drafterBlueprints";
import type { Player } from "./types";

export const PICK_TIME_LIMIT_SECONDS = 20;
export const OPPONENT_PICK_MIN_MS = 3000;
export const OPPONENT_PICK_MAX_MS = 9000;

export const createUserDrafter = (): Drafter => ({
  id: "user",
  name: "You",
  city: "Your squad",
  accent: "#2563eb",
  draftSlots: generateDraftSlots(),
  lineup: [],
});

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
