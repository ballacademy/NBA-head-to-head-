import { describe, expect, it } from "vitest";
import {
  comparePlayersForTeamColumn,
  getPlayerLastTeam,
  getPlayerTeamGroupingKey,
  getPlayerTeamSearchText,
} from "./freeAgents";
import type { Player } from "./types";

const rosterPlayer = {
  team: "HOU",
  name: "Fred VanVleet",
} as Player;

const freeAgent = {
  team: "FA",
  lastTeam: "HOU",
  name: "Cam Thomas",
} as Player;

const ungroupedFreeAgent = {
  team: "FA",
  name: "Unknown Free Agent",
} as Player;

describe("free agent team helpers", () => {
  it("groups free agents under their last team for sorting", () => {
    expect(getPlayerLastTeam(freeAgent)).toBe("HOU");
    expect(getPlayerTeamGroupingKey(freeAgent)).toBe("HOU");
    expect(getPlayerTeamGroupingKey(rosterPlayer)).toBe("HOU");
    expect(getPlayerTeamGroupingKey(ungroupedFreeAgent)).toBe("ZZZ");
  });

  it("includes the last team in stats search text", () => {
    expect(getPlayerTeamSearchText(freeAgent)).toBe("FA HOU");
    expect(getPlayerTeamSearchText(rosterPlayer)).toBe("HOU");
  });

  it("sorts roster players before free agents from the same last team", () => {
    expect(
      comparePlayersForTeamColumn(rosterPlayer, freeAgent, "asc"),
    ).toBeLessThan(0);
    expect(
      comparePlayersForTeamColumn(freeAgent, rosterPlayer, "asc"),
    ).toBeGreaterThan(0);
  });

  it("keeps free agents with the same last team together when sorting by team", () => {
    const anotherHoustonFreeAgent = {
      team: "FA",
      lastTeam: "HOU",
      name: "Aaron Holiday",
    } as Player;
    const milwaukeePlayer = {
      team: "MIL",
      name: "Giannis Antetokounmpo",
    } as Player;

    expect(
      comparePlayersForTeamColumn(freeAgent, milwaukeePlayer, "asc"),
    ).toBeLessThan(0);
    expect(
      comparePlayersForTeamColumn(
        anotherHoustonFreeAgent,
        freeAgent,
        "asc",
      ),
    ).toBeLessThan(0);
  });
});
