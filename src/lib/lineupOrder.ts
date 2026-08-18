import type { Player, Position } from "./types";

const POSITION_ORDER: Record<Position, number> = {
  PG: 0,
  SG: 1,
  SF: 2,
  PF: 3,
  C: 4,
};

const getSecondaryPosition = (player: Player): Position | undefined =>
  player.positions.length > 1 ? player.positions[1] : undefined;

/** Lineup slot used for ordering among players with the same listed primary. */
const getLineupSlotPosition = (player: Player): number => {
  const secondary = getSecondaryPosition(player);
  return POSITION_ORDER[secondary ?? player.position];
};

export const sortLineupByPosition = (lineup: Player[]) =>
  [...lineup].sort((left, right) => {
    const primaryComparison =
      POSITION_ORDER[left.position] - POSITION_ORDER[right.position];
    if (primaryComparison !== 0) {
      return primaryComparison;
    }

    const slotComparison =
      getLineupSlotPosition(left) - getLineupSlotPosition(right);
    if (slotComparison !== 0) {
      return slotComparison;
    }

    const leftSinglePosition = left.positions.length === 1 ? 0 : 1;
    const rightSinglePosition = right.positions.length === 1 ? 0 : 1;
    if (leftSinglePosition !== rightSinglePosition) {
      return leftSinglePosition - rightSinglePosition;
    }

    const heightComparison = left.heightInches - right.heightInches;
    if (heightComparison !== 0) {
      return heightComparison;
    }

    return left.name.localeCompare(right.name);
  });

export const LINEUP_SLOTS: Position[] = ["PG", "SG", "SF", "PF", "C"];

const SLOT_HEIGHT: Record<Position, number> = {
  PG: 74,
  SG: 77,
  SF: 80,
  PF: 83,
  C: 84,
};

const slotFitCost = (player: Player, slot: Position) => {
  const listedIndex = player.positions.indexOf(slot);
  const eligibility =
    listedIndex === 0 ? 0 : listedIndex > 0 ? 1 : 10 + Math.min(
      ...player.positions.map(
        (position) =>
          Math.abs(POSITION_ORDER[position] - POSITION_ORDER[slot]),
      ),
      Math.abs(POSITION_ORDER[player.position] - POSITION_ORDER[slot]),
    );
  const heightFit = Math.abs(player.heightInches - SLOT_HEIGHT[slot]) / 100;
  return eligibility + heightFit;
};

/**
 * Assign unique PG–C lineup slots so a five of listed PGs/SFs still
 * displays as the positions they would play in the lineup.
 */
export const assignLineupSlots = (
  lineup: Player[],
): { player: Player; slot: Position }[] => {
  const players = lineup.slice(0, LINEUP_SLOTS.length);
  if (players.length === 0) {
    return [];
  }

  let best: { player: Player; slot: Position }[] | null = null;
  let bestCost = Number.POSITIVE_INFINITY;

  const search = (
    remainingPlayers: Player[],
    remainingSlots: Position[],
    assigned: { player: Player; slot: Position }[],
    cost: number,
  ) => {
    if (cost >= bestCost) {
      return;
    }

    if (remainingPlayers.length === 0) {
      best = assigned;
      bestCost = cost;
      return;
    }

    const player = remainingPlayers[0]!;
    const nextPlayers = remainingPlayers.slice(1);

    for (let index = 0; index < remainingSlots.length; index += 1) {
      const slot = remainingSlots[index]!;
      search(
        nextPlayers,
        remainingSlots.filter((_, slotIndex) => slotIndex !== index),
        [...assigned, { player, slot }],
        cost + slotFitCost(player, slot),
      );
    }
  };

  search(players, [...LINEUP_SLOTS], [], 0);

  return (best ?? players.map((player, index) => ({
    player,
    slot: LINEUP_SLOTS[index] ?? "SF",
  }))).sort(
    (left, right) => POSITION_ORDER[left.slot] - POSITION_ORDER[right.slot],
  );
};

/** Zip two lineups by PG–C lineup slots so matchup rows can align vertically. */
export const pairLineupsByPosition = (
  leftLineup: Player[],
  rightLineup: Player[],
) => {
  const leftBySlot = new Map(
    assignLineupSlots(leftLineup).map((entry) => [entry.slot, entry.player]),
  );
  const rightBySlot = new Map(
    assignLineupSlots(rightLineup).map((entry) => [entry.slot, entry.player]),
  );

  return LINEUP_SLOTS.map((position) => ({
    left: leftBySlot.get(position) ?? null,
    right: rightBySlot.get(position) ?? null,
    position,
  }));
};
