import { describe, expect, it } from "vitest";
import { players } from "./playerPool";
import { getPlayerSalary, PLAYER_SALARY_SEASON } from "./playerSalaries";

describe("player salaries", () => {
  it("loads 2026-27 contract salaries for star players", () => {
    expect(PLAYER_SALARY_SEASON).toBe("2026-27");
    expect(getPlayerSalary("curryst01")).toBe(62_587_158);
    expect(getPlayerSalary("gilgesh01")).toBe(40_806_150);
    expect(getPlayerSalary("jokicni01")).toBe(59_033_114);
    expect(getPlayerSalary("vassede01")).toBe(27_000_000);
  });

  it("attaches salaries to the player pool", () => {
    const curry = players.find((player) => player.bbrPlayerId === "curryst01");
    const shai = players.find((player) => player.bbrPlayerId === "gilgesh01");

    expect(curry?.salary).toBe(62_587_158);
    expect(shai?.salary).toBe(40_806_150);
  });
});
