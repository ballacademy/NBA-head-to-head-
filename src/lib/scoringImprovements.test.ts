import { describe, expect, it } from "vitest";
import { getPlayersById, calculateLineupScore } from "./scoring";
import { players } from "./playerPool";
import { hasReliableLineupSpacing } from "./lineupShooting";
import { buildLineupShootingProfile } from "./lineupShooting";

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

    expect(hasReliableLineupSpacing(shootingProfile)).toBe(true);
    expect(score.strengths).toContain(
      "Enough shooting to keep the floor spaced.",
    );
    expect(score.warnings).not.toContain(
      "Positional overlap makes matchups harder to cover.",
    );
    expect(score.projectedRecord.wins).toBeGreaterThan(48);
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
