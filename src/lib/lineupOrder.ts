import type { Player, Position } from "./types";

const POSITION_ORDER: Record<Position, number> = {
  PG: 0,
  SG: 1,
  SF: 2,
  PF: 3,
  C: 4,
};

export const sortLineupByPosition = (lineup: Player[]) =>
  [...lineup].sort(
    (left, right) =>
      POSITION_ORDER[left.position] - POSITION_ORDER[right.position] ||
      left.name.localeCompare(right.name),
  );
