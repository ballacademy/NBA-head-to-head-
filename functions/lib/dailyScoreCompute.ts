import { getDailyDraftSetup } from "../../src/lib/dailyDraft";
import { getDivisionForTeam, isDraftableTeam } from "../../src/lib/divisions";
import {
  formatGoalResult,
  scoreLineupForGoal,
} from "../../src/lib/dailyGoalScoring";
import { slotUsesAgeBand } from "../../src/lib/draft";
import { playersById } from "../../src/lib/playerPool";
import { playerMatchesPosition } from "../../src/lib/positions";
import type { DailyDraftMode, Player } from "../../src/lib/types";

export type DailySubmissionComputeResult =
  | { ok: true; value: number; formattedResult: string; mode: DailyDraftMode }
  | { ok: false; error: string };

const isDailyMode = (value: string): value is DailyDraftMode =>
  value === "basic" || value === "advanced";

/**
 * Validate a Daily submission against the canonical date/mode setup, then score.
 * Rejects wrong goals, duplicate ids, and players that miss slot constraints.
 */
export const computeDailySubmissionValue = (
  dateKey: string,
  mode: string,
  goalId: string,
  lineupIds: string[],
): DailySubmissionComputeResult => {
  if (!isDailyMode(mode)) {
    return { ok: false, error: "mode must be basic or advanced" };
  }

  if (lineupIds.length !== 5) {
    return { ok: false, error: "lineup must contain exactly 5 player ids" };
  }

  const unique = new Set(lineupIds);
  if (unique.size !== 5) {
    return { ok: false, error: "lineup must contain 5 unique player ids" };
  }

  const setup = getDailyDraftSetup(dateKey, mode);
  if (setup.goal.id !== goalId) {
    return {
      ok: false,
      error: "goalId does not match the Daily challenge for this date and mode",
    };
  }

  if (setup.slots.length !== 5) {
    return { ok: false, error: "Daily slots are unavailable for this date" };
  }

  const lineup: Player[] = [];
  const pickedIds = new Set<string>();

  for (let index = 0; index < lineupIds.length; index += 1) {
    const id = lineupIds[index]!;
    const player = playersById.get(id);
    if (!player) {
      return { ok: false, error: "lineup contains unknown player ids" };
    }

    if (pickedIds.has(player.id)) {
      return { ok: false, error: "lineup must contain 5 unique player ids" };
    }
    pickedIds.add(player.id);

    const slot = setup.slots[index]!;
    if (!playerMatchesPosition(player, slot.position)) {
      return {
        ok: false,
        error: `lineup slot ${index + 1} requires position ${slot.position}`,
      };
    }

    if (!isDraftableTeam(player.team)) {
      return { ok: false, error: "lineup contains a non-draftable team" };
    }

    if (slotUsesAgeBand(slot)) {
      if (typeof player.age !== "number") {
        return {
          ok: false,
          error: `lineup slot ${index + 1} requires an age-band eligible player`,
        };
      }
      if (player.age < slot.minAge! || player.age > slot.maxAge!) {
        return {
          ok: false,
          error: `lineup slot ${index + 1} is outside the required age band`,
        };
      }
    } else if (getDivisionForTeam(player.team) !== slot.division) {
      return {
        ok: false,
        error: `lineup slot ${index + 1} requires ${slot.division} division`,
      };
    }

    lineup.push(player);
  }

  const value = scoreLineupForGoal(lineup, setup.goal);
  return {
    ok: true,
    value,
    formattedResult: formatGoalResult(value, setup.goal),
    mode,
  };
};
