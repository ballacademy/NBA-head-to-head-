import type { Drafter } from "../lib/types";
import { initialDrafterBlueprints } from "./drafterBlueprints";
import { players, resolveLineup, statsFile } from "../lib/playerPool";

export { players, statsFile };

export const initialDrafters: Drafter[] = initialDrafterBlueprints.map(
  (blueprint) => ({
    id: blueprint.id,
    name: blueprint.name,
    city: blueprint.city,
    accent: blueprint.accent,
    lineup: resolveLineup(blueprint.lineupNames),
  }),
);
