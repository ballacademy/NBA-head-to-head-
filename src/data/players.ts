import type { Drafter } from "../lib/types";
import { autoDraftLineup, generateFeasibleDraftSlots } from "../lib/draft";
import { initialDrafterBlueprints } from "./drafterBlueprints";
import { players, statsFile } from "../lib/playerPool";

export { players, statsFile };

export const initialDrafters: Drafter[] = initialDrafterBlueprints.map(
  (blueprint) => {
    const draftSlots = generateFeasibleDraftSlots(players);

    return {
      id: blueprint.id,
      name: blueprint.name,
      city: blueprint.city,
      accent: blueprint.accent,
      draftSlots,
      lineup: autoDraftLineup(players, draftSlots),
    };
  },
);
