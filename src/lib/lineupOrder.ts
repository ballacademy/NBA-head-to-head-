import type { Player, Position } from "./types";

const POSITION_ORDER: Record<Position, number> = {
  PG: 0,
  SG: 1,
  SF: 2,
  PF: 3,
  C: 4,
};

/**
 * Guard→center continuum from listed positions.
 * Hybrids lean toward the smaller (guard-side) listed spot so e.g. SG/SF sits
 * between SG and SF — closer to the top of the lineup than a pure SF, and much
 * closer than PF.
 */
export const getPositionContinuumIndex = (player: Player): number => {
  const orders = (player.positions.length > 0
    ? player.positions
    : [player.position]
  ).map((position) => POSITION_ORDER[position]);

  if (orders.length === 1) {
    return orders[0]!;
  }

  const min = Math.min(...orders);
  const max = Math.max(...orders);
  return min * 0.65 + max * 0.35;
};

export const sortLineupByPosition = (lineup: Player[]) =>
  [...lineup].sort((left, right) => {
    const continuumComparison =
      getPositionContinuumIndex(left) - getPositionContinuumIndex(right);
    if (continuumComparison !== 0) {
      return continuumComparison;
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

/**
 * Continuum distance is the main “where do they sit” signal. Listed eligibility
 * still prefers primary → secondary → stretch, but stretch cost scales with how
 * far the slot is on the PG→C continuum so a pure SF slides to PF more cheaply
 * than an SG/SF does — without letting a PG freely claim C.
 */
const CONTINUUM_FIT_WEIGHT = 2;
const LISTED_SECONDARY_COST = 0.35;
const UNLISTED_STRETCH_BASE = 2;

const slotFitCost = (player: Player, slot: Position) => {
  const continuumDist = Math.abs(
    getPositionContinuumIndex(player) - POSITION_ORDER[slot],
  );
  const listedIndex = player.positions.indexOf(slot);
  const eligibility =
    listedIndex === 0
      ? 0
      : listedIndex > 0
        ? LISTED_SECONDARY_COST
        : UNLISTED_STRETCH_BASE + continuumDist;
  const heightFit = Math.abs(player.heightInches - SLOT_HEIGHT[slot]) / 100;
  return continuumDist * CONTINUUM_FIT_WEIGHT + eligibility + heightFit;
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
