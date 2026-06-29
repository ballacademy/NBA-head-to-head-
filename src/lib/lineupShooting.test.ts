import { describe, expect, it } from "vitest";
import type { Player } from "./types";
import {
  buildLineupShootingProfile,
  hasReliableLineupSpacing,
  scoreLineupThreePointBonus,
} from "./lineupShooting";

const makePlayer = (
  name: string,
  threePoint: number,
  threePointersAttempted: number,
): Player => ({
  id: name,
  name,
  team: "LAL",
  position: "SF",
  positions: ["SF"],
  jerseyNumber: 1,
  points: 14,
  rebounds: 4,
  assists: 2,
  steals: 0.8,
  blocks: 0.4,
  turnovers: 1.5,
  trueShooting: 0.58,
  threePoint,
  threePointersAttempted,
  fieldGoalsAttempted: 12,
  minutes: 30,
  heightInches: 79,
  usage: 20,
  defense: 6,
  gamesPlayed: 70,
  styles: ["shooter"],
});

const uniformWeights = (lineup: Player[]) => lineup.map(() => 1);

describe("lineupShooting", () => {
  it("rewards balanced passable shooting over two elite shooters and three non-shooters", () => {
    const balanced = Array.from({ length: 5 }, (_, index) =>
      makePlayer(`Balanced ${index}`, 0.365, 6),
    );
    const spiky = [
      makePlayer("Elite A", 0.41, 9),
      makePlayer("Elite B", 0.4, 8),
      makePlayer("Non A", 0.29, 2),
      makePlayer("Non B", 0.3, 1.5),
      makePlayer("Non C", 0.28, 1),
    ];

    const balancedProfile = buildLineupShootingProfile(
      balanced,
      uniformWeights(balanced),
      balanced.length,
    );
    const spikyProfile = buildLineupShootingProfile(
      spiky,
      uniformWeights(spiky),
      spiky.length,
    );

    expect(scoreLineupThreePointBonus(balancedProfile)).toBeGreaterThan(
      scoreLineupThreePointBonus(spikyProfile),
    );
    expect(hasReliableLineupSpacing(balancedProfile)).toBe(true);
    expect(hasReliableLineupSpacing(spikyProfile)).toBe(false);
  });
});
