// This file is overwritten by `npm run fetch-roster`, which pulls an
// authoritative NBA roster + stats from the balldontlie API. Until that script
// is run (it needs BALLDONTLIE_API_KEY), it falls back to the curated roster so
// the app always builds and runs.
import { curatedPlayers } from "./roster.curated";
import type { Player } from "../lib/types";

export const generatedPlayers: Player[] = curatedPlayers;
export const rosterSource = "curated (fallback)";
export const rosterUpdatedAt: string | null = null;
