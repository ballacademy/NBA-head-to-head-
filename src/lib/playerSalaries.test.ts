import { describe, expect, it } from "vitest";
import { players } from "./playerPool";
import {
  formatCapSalary,
  getPlayerSalary,
  hasPlayerContractSalary,
  PLAYER_SALARY_SEASON,
  salaryLabelForPlayer,
} from "./playerSalaries";

describe("player salaries", () => {
  it("loads 2026-27 contract salaries for star players", () => {
    expect(PLAYER_SALARY_SEASON).toBe("2026-27");
    expect(getPlayerSalary("curryst01")).toBe(62_587_158);
    expect(getPlayerSalary("gilgesh01")).toBe(40_806_150);
    expect(getPlayerSalary("jokicni01")).toBe(59_033_114);
    expect(getPlayerSalary("vassede01")).toBe(27_000_000);
    // Year-1 cash, not AAV of the new max deal.
    expect(getPlayerSalary("reaveau01")).toBe(41_240_250);
  });

  it("does not invent a minimum salary for players without contracts", () => {
    expect(hasPlayerContractSalary("curryst01")).toBe(true);
    expect(getPlayerSalary("not-a-real-player")).toBeUndefined();
  });

  it("maps ESPN ids onto cap numbers and formats millions", () => {
    expect(formatCapSalary(59_033_114)).toBe("$59.0M");
    expect(formatCapSalary(2_221_677)).toBe("$2.2M");
    expect(salaryLabelForPlayer(undefined, "3112335")).toBe("$59.0M");
  });

  it("attaches salaries to the player pool", () => {
    const curry = players.find((player) => player.bbrPlayerId === "curryst01");
    const shai = players.find((player) => player.bbrPlayerId === "gilgesh01");
    const lavine = players.find((player) => player.bbrPlayerId === "lavinza01");

    expect(curry?.salary).toBe(62_587_158);
    expect(shai?.salary).toBe(40_806_150);
    expect(lavine?.salary).toBe(48_967_380);
    expect(lavine?.team).toBe("SAC");
  });
});
