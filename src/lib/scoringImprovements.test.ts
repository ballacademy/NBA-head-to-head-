import { describe, expect, it } from "vitest";
import { getPlayersById, calculateLineupScore } from "./scoring";
import { players } from "./playerPool";
import {
  assessLineupSpacingFeedback,
  buildLineupShootingProfile,
  isEliteThreePointShooter,
  isNonThreePointShooter,
  isPassableThreePointShooter,
} from "./lineupShooting";

const lineup = (ids: string[]) => getPlayersById(ids, players);

describe("lineup scoring improvements", () => {
  it("treats the Luka/Pritchard/Murphy/MPJ/Chet lineup as spaced and not position-penalized", () => {
    const userLineup = lineup([
      "doncilu01-lal",
      "pritcpa01-bos",
      "murphtr02-nop",
      "portemi01-brk",
      "holmgch01-okc",
    ]);
    const score = calculateLineupScore(userLineup);
    const shootingProfile = buildLineupShootingProfile(
      userLineup,
      userLineup.map(() => 1),
      userLineup.length,
    );
    const spacing = assessLineupSpacingFeedback({
      passableShooters: userLineup.filter(isPassableThreePointShooter).length,
      eliteShooters: userLineup.filter(isEliteThreePointShooter).length,
      nonShooters: userLineup.filter(isNonThreePointShooter).length,
      volumeWeightedThreePoint: shootingProfile.volumeWeightedThreePoint,
    });

    expect(spacing).toBe("strength");
    expect(score.strengths).toContain(
      "Enough shooting to keep the floor spaced.",
    );
    expect(score.warnings).not.toContain(
      "Positional overlap makes matchups harder to cover.",
    );
    expect(score.projectedRecord.wins).toBeGreaterThan(48);
  });

  it("does not praise average-or-worse spacing on a two-shooter Harden five", () => {
    const byName = (name: string) => {
      const hit = players.find((player) => player.name === name);
      if (!hit) {
        throw new Error(`Missing ${name}`);
      }
      return hit;
    };
    const talentHeavy = [
      byName("James Harden"),
      byName("Tyrese Maxey"),
      byName("Deni Avdija"),
      byName("Giannis Antetokounmpo"),
      byName("Maxime Raynaud"),
    ];
    const score = calculateLineupScore(talentHeavy);

    expect(talentHeavy.filter(isPassableThreePointShooter).length).toBe(2);
    expect(score.strengths).not.toContain(
      "Enough shooting to keep the floor spaced.",
    );
    expect(score.warnings).toContain(
      "Spacing is fragile; defenses can load the paint.",
    );
  });

  it("factors team quality into mixed lineups through raw scoring", () => {
    const strongTeams = lineup([
      "doncilu01-lal",
      "pritcpa01-bos",
      "holmgch01-okc",
      "gilgesh01-okc",
      "tatumja01-bos",
    ]);
    const weakTeams = lineup([
      "reidna01-cho",
      "washipj01-cho",
      "ballla01-cho",
      "hende01-cho",
      "millbr01-cho",
    ]);

    expect(calculateLineupScore(strongTeams).preciseTotal).toBeGreaterThan(
      calculateLineupScore(weakTeams).preciseTotal,
    );
  });
});
