import { describe, expect, it } from "vitest";
import {
  EAST_TEAMS,
  getTeam,
  NBA_TEAMS,
  NBA_TEAMS_BY_ID,
  WEST_TEAMS,
} from "./teams";

describe("NBA_TEAMS", () => {
  it("includes all 30 clubs with unique ids and logos", () => {
    expect(NBA_TEAMS).toHaveLength(30);
    const ids = NBA_TEAMS.map((team) => team.id);
    expect(new Set(ids).size).toBe(30);
    expect(EAST_TEAMS).toHaveLength(15);
    expect(WEST_TEAMS).toHaveLength(15);
    for (const team of NBA_TEAMS) {
      expect(team.logoSrc).toBe(`/nba-logos/${team.id}.png`);
      expect(team.cellFrom).toMatch(/^#[0-9a-f]{6}$/i);
      expect(team.cellTo).toMatch(/^#[0-9a-f]{6}$/i);
      expect(NBA_TEAMS_BY_ID[team.id]).toBe(team);
    }
  });

  it("looks up teams and ignores missing ids", () => {
    expect(getTeam("BOS")?.name).toBe("Boston Celtics");
    expect(getTeam(null)).toBeNull();
    expect(getTeam("XYZ")).toBeNull();
  });
});
