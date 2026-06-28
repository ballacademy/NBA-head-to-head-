import {
  canCompleteSalaryCapDraft,
  filterPlayersForSlot,
  sortDraftCandidates,
  type DraftFilterOptions,
} from "./draft";
import type { DraftSlotConstraint, Player } from "./types";
import { estimatePlayerSalary, getMaxAffordableSalary } from "./salaryCap";

export const filterSalaryCapPlayersForSlot = (
  lineupIds: Array<string | undefined>,
  pool: Player[],
  slot: DraftSlotConstraint,
  draftSlots: DraftSlotConstraint[],
  activeStep: number,
  salaryCapLimit: number,
) => {
  const poolById = new Map(pool.map((player) => [player.id, player]));
  const lineup = lineupIds
    .map((playerId) => (playerId ? poolById.get(playerId) : undefined))
    .filter((player): player is Player => Boolean(player));
  const pickedIds = new Set(lineup.map((player) => player.id));
  const picksRemaining = draftSlots.length - activeStep;
  const maxAffordableSalary = getMaxAffordableSalary(
    lineup,
    picksRemaining,
    salaryCapLimit,
  );

  let candidates = filterPlayersForSlot(pool, slot, pickedIds, {
    maxAffordableSalary,
  });

  if (picksRemaining > 1) {
    const remainingSlots = draftSlots.slice(activeStep + 1);
    candidates = candidates.filter((candidate) =>
      canCompleteSalaryCapDraft(
        pool,
        [...lineup, candidate],
        remainingSlots,
        salaryCapLimit,
      ),
    );
  }

  return sortDraftCandidates(candidates);
};

export const getSalaryCapDraftOptions = (
  lineupIds: Array<string | undefined>,
  pool: Player[],
  activeStep: number,
  totalPicks: number,
  salaryCapLimit?: number,
  draftSlots: DraftSlotConstraint[] = [],
): DraftFilterOptions => {
  if (salaryCapLimit == null) {
    return {};
  }

  const slot = draftSlots[activeStep];

  if (slot && draftSlots.length === totalPicks) {
    const candidates = filterSalaryCapPlayersForSlot(
      lineupIds,
      pool,
      slot,
      draftSlots,
      activeStep,
      salaryCapLimit,
    );
    const poolById = new Map(pool.map((player) => [player.id, player]));
    const lineup = lineupIds
      .map((playerId) => (playerId ? poolById.get(playerId) : undefined))
      .filter((player): player is Player => Boolean(player));
    const picksRemaining = totalPicks - activeStep;

    return {
      maxAffordableSalary:
        candidates.length > 0
          ? Math.max(...candidates.map((player) => estimatePlayerSalary(player)))
          : getMaxAffordableSalary(lineup, picksRemaining, salaryCapLimit),
      allowedPlayerIds: new Set(candidates.map((player) => player.id)),
    };
  }

  const poolById = new Map(pool.map((player) => [player.id, player]));
  const lineup = lineupIds
    .map((playerId) => (playerId ? poolById.get(playerId) : undefined))
    .filter((player): player is Player => Boolean(player));
  const picksRemaining = totalPicks - activeStep;

  return {
    maxAffordableSalary: getMaxAffordableSalary(
      lineup,
      picksRemaining,
      salaryCapLimit,
    ),
  };
};
