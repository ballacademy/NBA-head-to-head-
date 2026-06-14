import { describe, expect, it } from "vitest";
import { players } from "../data/players";
import {
  calculateLineupScore,
  compareLineups,
  getPlayersById,
} from "./scoring";

const lineup = (ids: string[]) => getPlayersById(ids, players);

describe("calculateLineupScore", () => {
  it("rewards a complete lineup with production, efficiency, shooting, and fit", () => {
    const score = calculateLineupScore(
      lineup([
        "shai-gilgeous-alexander",
        "derrick-white",
        "jayson-tatum",
        "aaron-gordon",
        "nikola-jokic",
      ]),
    );

    expect(score.total).toBeGreaterThan(150);
    expect(score.categories.map((category) => category.label)).toEqual([
      "Box score production",
      "True shooting and defense",
      "Three-point bonus",
      "Team fit",
    ]);
    expect(score.strengths).toContain(
      "Creation and connective passing should travel well.",
    );
  });

  it("flags high-usage lineups with fragile defensive fit", () => {
    const score = calculateLineupScore(
      lineup([
        "luka-doncic",
        "stephen-curry",
        "devin-booker",
        "jalen-brunson",
        "kyrie-irving",
      ]),
    );

    expect(score.warnings).toContain(
      "Ball-dominant stars may fight for the same touches.",
    );
    expect(score.warnings).toContain(
      "Not enough defenders to survive elite scorers.",
    );
    expect(score.warnings).toContain(
      "Positional overlap makes matchups harder to cover.",
    );
  });
});

describe("compareLineups", () => {
  it("selects the higher scoring lineup as the matchup winner", () => {
    const result = compareLineups(
      lineup([
        "shai-gilgeous-alexander",
        "derrick-white",
        "jayson-tatum",
        "aaron-gordon",
        "nikola-jokic",
      ]),
      lineup([
        "luka-doncic",
        "stephen-curry",
        "devin-booker",
        "jalen-brunson",
        "kyrie-irving",
      ]),
    );

    expect(result.winner).toBe("A");
    expect(result.margin).toBeGreaterThan(0);
  });
});
