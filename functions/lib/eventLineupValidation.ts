import { players } from "../../src/lib/playerPool";
import {
  filterPlayersForEventRestriction,
  getCurrentWeeklyEvent,
} from "../../src/lib/weeklyEvents";

/**
 * Validate lineup ids against the current weekly event restriction pool.
 * Returns an error message, or null when the lineup is eligible.
 */
export const validateEventLineupIds = (lineup: string[]): string | null => {
  const event = getCurrentWeeklyEvent(players);
  if (!event) {
    return "no active weekly event";
  }

  const allowed = new Set(
    filterPlayersForEventRestriction(players, event.restriction).map(
      (player) => player.id,
    ),
  );

  for (const id of lineup) {
    if (!allowed.has(id)) {
      return "lineup contains players not eligible for the current weekly event";
    }
  }

  return null;
};
