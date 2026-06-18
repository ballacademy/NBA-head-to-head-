import type { Player } from "./types";
import { getMaxAffordableSalary } from "./salaryCap";
import type { DraftFilterOptions } from "./draft";

export const getSalaryCapDraftOptions = (
  lineupIds: Array<string | undefined>,
  pool: Player[],
  activeStep: number,
  totalPicks: number,
  salaryCapMode: boolean,
): DraftFilterOptions => {
  if (!salaryCapMode) {
    return {};
  }

  const poolById = new Map(pool.map((player) => [player.id, player]));
  const lineup = lineupIds
    .map((playerId) => (playerId ? poolById.get(playerId) : undefined))
    .filter((player): player is Player => Boolean(player));
  const picksRemaining = totalPicks - activeStep;

  return {
    maxAffordableSalary: getMaxAffordableSalary(lineup, picksRemaining),
  };
};
