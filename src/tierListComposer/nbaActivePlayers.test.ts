import { describe, expect, it } from "vitest";
import { NBA_TEAMS } from "../standingsComposer/teams";
import {
  NBA_ACTIVE_PLAYER_COUNT,
  NBA_ACTIVE_PLAYERS,
  NBA_HEADSHOT_CDN,
  NBA_ROSTER_SOURCE,
  getPlayer,
  searchPlayers,
} from "./nbaActivePlayers";

describe("active NBA player catalog", () => {
  it("covers every current ESPN roster with CDN headshots", () => {
    expect(NBA_ACTIVE_PLAYER_COUNT).toBeGreaterThanOrEqual(450);
    expect(NBA_ACTIVE_PLAYERS).toHaveLength(NBA_ACTIVE_PLAYER_COUNT);
    const teams = new Set(NBA_ACTIVE_PLAYERS.map((player) => player.team));
    expect(teams.size).toBe(NBA_TEAMS.length);
    expect(
      NBA_ACTIVE_PLAYERS.every(
        (player) =>
          player.headshotUrl.startsWith("https://a.espncdn.com/i/headshots/nba/"),
      ),
    ).toBe(true);
    expect(NBA_HEADSHOT_CDN).toContain("a.espncdn.com");
    expect(NBA_ROSTER_SOURCE).toContain("site.api.espn.com");
  });

  it("looks up and searches by name or team", () => {
    const lebron = getPlayer("1966");
    expect(lebron?.name).toMatch(/LeBron/i);
    const curry = searchPlayers("curry");
    expect(curry.some((player) => player.name.includes("Curry"))).toBe(true);
    const lakers = searchPlayers("LAL");
    expect(lakers.length).toBeGreaterThan(5);
    expect(lakers.every((player) => player.team === "LAL")).toBe(true);
    const east = searchPlayers("", "East");
    const west = searchPlayers("", "West");
    expect(east.length + west.length).toBe(NBA_ACTIVE_PLAYER_COUNT);
  });
});
