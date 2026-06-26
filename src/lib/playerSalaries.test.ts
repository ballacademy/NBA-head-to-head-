import { describe, expect, it } from "vitest";
import { players } from "./playerPool";
import { getPlayerSalary, PLAYER_SALARY_SEASON } from "./playerSalaries";

describe("player salaries", () => {
  it("loads 2025-26 contract salaries for star players", () => {
    expect(PLAYER_SALARY_SEASON).toBe("2025-26");
    expect(getPlayerSalary("curryst01")).toBe(59_606_817);
    expect(getPlayerSalary("gilgesh01")).toBe(38_333_050);
    expect(getPlayerSalary("jokicni01")).toBe(55_224_526);
  });

  it("attaches salaries to the player pool", () => {
    const curry = players.find((player) => player.bbrPlayerId === "curryst01");
    const shai = players.find((player) => player.bbrPlayerId === "gilgesh01");

    expect(curry?.salary).toBe(59_606_817);
    expect(shai?.salary).toBe(38_333_050);
  });
});
