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

export const sortLineupByPosition = (lineup: Player[]) =>
  [...lineup].sort((left, right) => {
    const primaryComparison =
      POSITION_ORDER[left.position] - POSITION_ORDER[right.position];
    if (primaryComparison !== 0) {
      return primaryComparison;
    }

    const leftSinglePosition = left.positions.length === 1 ? 0 : 1;
    const rightSinglePosition = right.positions.length === 1 ? 0 : 1;
    if (leftSinglePosition !== rightSinglePosition) {
      return leftSinglePosition - rightSinglePosition;
    }

    const leftSecondary = getSecondaryPosition(left);
    const rightSecondary = getSecondaryPosition(right);
    if (leftSecondary && rightSecondary) {
      const secondaryComparison =
        POSITION_ORDER[leftSecondary] - POSITION_ORDER[rightSecondary];
      if (secondaryComparison !== 0) {
        return secondaryComparison;
      }
    }

    const heightComparison = left.heightInches - right.heightInches;
    if (heightComparison !== 0) {
      return heightComparison;
    }

    return left.name.localeCompare(right.name);
  });
