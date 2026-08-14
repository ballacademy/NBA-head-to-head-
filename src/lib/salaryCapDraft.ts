import {
  canCompleteSalaryCapDraft,
  filterPlayersForSlot,
  sortDraftCandidates,
  type DraftFilterOptions,
  type DraftSortMode,
} from "./draft";
import type { DraftSlotConstraint, Player } from "./types";
import { estimatePlayerSalary, getMaxAffordableSalary } from "./salaryCap";

export type { DraftSortMode };

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

export const isPlayerAffordableForDraft = (
  player: Player,
  options: DraftFilterOptions,
) => {
  if (
    options.allowedPlayerIds !== undefined &&
    !options.allowedPlayerIds.has(player.id)
  ) {
    return false;
  }

  if (
    options.maxAffordableSalary !== undefined &&
    estimatePlayerSalary(player) > options.maxAffordableSalary
  ) {
    return false;
  }

  return true;
};

/** Position-eligible picks with affordable players first; unaffordable last. */
export const buildDraftCandidateList = (
  pool: Player[],
  slot: DraftSlotConstraint,
  pickedIds: Set<string>,
  options: DraftFilterOptions,
  sortMode: DraftSortMode = "points",
) => {
  const eligible = filterPlayersForSlot(pool, slot, pickedIds, {});
  const hasCapFilter =
    options.allowedPlayerIds !== undefined ||
    options.maxAffordableSalary !== undefined;

  if (!hasCapFilter) {
    return sortDraftCandidates(eligible, sortMode).map((player) => ({
      player,
      affordable: true,
    }));
  }

  const affordable: Player[] = [];
  const unaffordable: Player[] = [];

  for (const player of eligible) {
    if (isPlayerAffordableForDraft(player, options)) {
      affordable.push(player);
    } else {
      unaffordable.push(player);
    }
  }

  return [
    ...sortDraftCandidates(affordable, sortMode).map((player) => ({
      player,
      affordable: true,
    })),
    ...sortDraftCandidates(unaffordable, sortMode).map((player) => ({
      player,
      affordable: false,
    })),
  ];
};
