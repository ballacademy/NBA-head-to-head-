import { conferenceForTeam } from "./teams";
import type { Conference, Division, Position } from "./types";

export interface SlotGrant {
  division: Division;
  conference: Conference;
  position: Position;
}

export const DIVISIONS: { division: Division; conference: Conference }[] = [
  { division: "Atlantic", conference: "East" },
  { division: "Central", conference: "East" },
  { division: "Southeast", conference: "East" },
  { division: "Northwest", conference: "West" },
  { division: "Pacific", conference: "West" },
  { division: "Southwest", conference: "West" },
];

export const POSITIONS: Position[] = ["PG", "SG", "SF", "PF", "C"];

export const POSITION_NAMES: Record<Position, string> = {
  PG: "Point guard",
  SG: "Shooting guard",
  SF: "Small forward",
  PF: "Power forward",
  C: "Center",
};

// A position the draft board has not granted yet is heavily favored over one
// already granted, so most boards come out balanced (one of each position)
// while repeats — even an all-center board — remain possible.
const UNUSED_WEIGHT = 60;
const USED_WEIGHT = 1;

const LINEUP_SIZE = 5;

type Rng = () => number;

const emptyCounts = (): Record<Position, number> => ({
  PG: 0,
  SG: 0,
  SF: 0,
  PF: 0,
  C: 0,
});

const weightedPick = <T>(items: T[], weights: number[], rng: Rng): T => {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let threshold = rng() * total;
  for (let index = 0; index < items.length; index += 1) {
    threshold -= weights[index];
    if (threshold < 0) {
      return items[index];
    }
  }
  return items[items.length - 1];
};

export const choosePosition = (
  usedCounts: Record<Position, number>,
  rng: Rng = Math.random,
): Position => {
  const weights = POSITIONS.map((position) =>
    usedCounts[position] === 0 ? UNUSED_WEIGHT : USED_WEIGHT,
  );
  return weightedPick(POSITIONS, weights, rng);
};

export const generateDraftBoard = (
  slots = LINEUP_SIZE,
  rng: Rng = Math.random,
): SlotGrant[] => {
  const usedCounts = emptyCounts();
  const board: SlotGrant[] = [];

  for (let slot = 0; slot < slots; slot += 1) {
    const position = choosePosition(usedCounts, rng);
    usedCounts[position] += 1;

    const { division, conference } =
      DIVISIONS[Math.floor(rng() * DIVISIONS.length)] ?? DIVISIONS[0];

    board.push({ division, conference, position });
  }

  return board;
};

interface DraftablePlayer {
  id: string;
  team: string;
  position: Position;
  secondaryPositions?: Position[];
}

export const eligiblePositions = (player: DraftablePlayer): Position[] => [
  player.position,
  ...(player.secondaryPositions ?? []),
];

export const isEligibleForSlot = (
  player: DraftablePlayer,
  grant: SlotGrant,
): boolean =>
  conferenceForTeam(player.team) === grant.conference &&
  eligiblePositions(player).includes(grant.position);

// Fill a board with the strongest available player for each slot. Prefers an
// exact division-conference + position match; if the granted pool is exhausted
// it falls back to any unused player at that position so lineups stay full.
export const autofillFromBoard = <T extends DraftablePlayer & { points: number }>(
  board: SlotGrant[],
  pool: T[],
  exclude: string[] = [],
): string[] => {
  const used = new Set(exclude.filter(Boolean));

  return board.map((grant) => {
    const byPoints = (a: T, b: T) => b.points - a.points;

    const exact = pool
      .filter((player) => !used.has(player.id) && isEligibleForSlot(player, grant))
      .sort(byPoints)[0];

    const pick =
      exact ??
      pool
        .filter(
          (player) =>
            !used.has(player.id) &&
            eligiblePositions(player).includes(grant.position),
        )
        .sort(byPoints)[0];

    if (pick) {
      used.add(pick.id);
      return pick.id;
    }

    return "";
  });
};
