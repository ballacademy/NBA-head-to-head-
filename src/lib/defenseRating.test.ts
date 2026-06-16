import { describe, expect, it } from "vitest";
import { players } from "../data/players";
import {
  buildDefensiveRatings,
  computeDefensivePercentile,
  gradeFromPercentile,
  toDefensiveStatInput,
} from "./defenseRating";

describe("defenseRating", () => {
  it("ranks stronger defenders above weaker ones", () => {
    const players = [
      {
        id: "elite",
        bbrPlayerId: "elite01",
        ...toDefensiveStatInput({
          minutes: 34,
          gamesPlayed: 70,
          points: 12,
          steals: 1.4,
          blocks: 2.4,
          defensiveRebounds: 9.5,
          rebounds: 11,
          defensiveWinShares: 3.8,
          defensiveBoxPlusMinus: 2.5,
          defensiveReboundPct: 24,
          stealPct: 2.0,
          blockPct: 5.5,
        }),
      },
      {
        id: "weak",
        bbrPlayerId: "weak01",
        ...toDefensiveStatInput({
          minutes: 30,
          gamesPlayed: 70,
          points: 8,
          steals: 0.4,
          blocks: 0.2,
          defensiveRebounds: 1.8,
          rebounds: 3,
          defensiveWinShares: 0.2,
          defensiveBoxPlusMinus: -2.8,
          defensiveReboundPct: 8,
          stealPct: 0.7,
          blockPct: 0.4,
        }),
      },
    ];

    const ratings = buildDefensiveRatings(players);

    expect(ratings.get("elite")?.grade).toMatch(/^[AB]/);
    expect(ratings.get("weak")?.grade).toMatch(/^[BCD]/);
    expect(
      (ratings.get("elite")?.defense ?? 0) > (ratings.get("weak")?.defense ?? 0),
    ).toBe(true);
  });

  it("maps percentiles to letter grades", () => {
    expect(gradeFromPercentile(98)).toBe("A+");
    expect(gradeFromPercentile(90)).toBe("A");
    expect(gradeFromPercentile(72)).toBe("B+");
    expect(gradeFromPercentile(10)).toBe("D");
  });

  it("penalizes steal-heavy profiles without strong impact metrics", () => {
    const gambleDefender = {
      ...toDefensiveStatInput({
        minutes: 36,
        gamesPlayed: 70,
        points: 32,
        steals: 2.0,
        blocks: 0.4,
        defensiveRebounds: 4.0,
        rebounds: 5,
        defensiveWinShares: 2.5,
        defensiveBoxPlusMinus: 0.4,
        defensiveReboundPct: 12,
        stealPct: 2.8,
        blockPct: 0.8,
      }),
    };

    const tables = new Map<keyof import("./defenseRating").DefensiveStatInput, number[]>([
      ["stealsPer36", [0.5, 1.0, 1.5, 2.0]],
      ["defensiveBoxPlusMinus", [-1, 0, 0.4, 2.5]],
      ["blocksPer36", [0.2, 0.4, 0.8, 2.0]],
      ["defensiveWinSharesPerGame", [0.01, 0.02, 0.03, 0.05]],
      ["defensiveReboundPct", [8, 10, 12, 20]],
      ["stealPct", [0.8, 1.2, 2.0, 2.8]],
      ["blockPct", [0.5, 0.8, 1.2, 4.0]],
      ["defensiveReboundsPer36", [2, 3, 4, 8]],
    ]);

    const percentile = computeDefensivePercentile(gambleDefender, tables);
    expect(percentile).toBeLessThan(65);
  });

  it("grades at least thirty defenders at A- or better", () => {
    const eliteDefenders = players.filter((player) =>
      ["A+", "A", "A-"].includes(player.defenseGrade ?? ""),
    );

    expect(eliteDefenders.length).toBeGreaterThanOrEqual(30);
  });

  it("applies requested player overrides", () => {
    const chet = players.find((player) => player.name === "Chet Holmgren");
    const giannis = players.find((player) => player.name === "Giannis Antetokounmpo");
    const edwards = players.find((player) => player.name === "Anthony Edwards");

    expect(chet?.defenseGrade).toBe("A");
    expect(giannis?.defenseGrade).toBe("A-");
    expect(edwards?.defenseGrade).toBe("B");
  });
});
