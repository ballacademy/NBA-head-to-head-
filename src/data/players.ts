// Public roster entry point.
//
// `players` comes from the authoritative data source when it has been fetched
// (`npm run fetch-roster` overwrites players.generated.ts), and otherwise falls
// back to the hand-curated roster. The eight `initialDrafters` are the app's
// fictional challengers, independent of the player roster.
export { initialDrafters } from "./roster.curated";
export { rosterSource, rosterUpdatedAt } from "./players.generated";

import { generatedPlayers } from "./players.generated";

export const players = generatedPlayers;
