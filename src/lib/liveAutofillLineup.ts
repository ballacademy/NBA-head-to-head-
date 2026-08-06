import {
  autoDraftLineup,
  autoDraftLineupUnderSalaryCap,
  generateFeasibleDraftSlots,
  generateFeasibleDraftSlotsUnderSalaryCap,
} from "./draft";
import { createSeededRandom } from "./seededRandom";
import type { Player } from "./types";

/** Must stay in sync with server autofill gate in functions/api/live-match.ts */
export const LIVE_MATCH_LINEUP_WAIT_MS = 120_000;

export const buildLiveAutofillSeed = (matchId: string, opponentPlayerId: string) =>
  `live-autofill:${matchId}:${opponentPlayerId}`;

/**
 * Deterministic autofill lineup for a timed-out live opponent.
 * Same seed + pool + cap ⇒ same lineup on every client retry.
 */
export const buildLiveAutofillLineup = (params: {
  matchId: string;
  opponentPlayerId: string;
  players: Player[];
  salaryCapLimit?: number;
}): string[] => {
  const seed = buildLiveAutofillSeed(params.matchId, params.opponentPlayerId);
  const random = createSeededRandom(seed);

  if (params.salaryCapLimit != null) {
    const slots = generateFeasibleDraftSlotsUnderSalaryCap(
      params.players,
      params.salaryCapLimit,
      5,
      { random },
    );
    return autoDraftLineupUnderSalaryCap(
      params.players,
      slots,
      params.salaryCapLimit,
    );
  }

  const slots = generateFeasibleDraftSlots(params.players, 5, { random });
  return autoDraftLineup(params.players, slots);
};
