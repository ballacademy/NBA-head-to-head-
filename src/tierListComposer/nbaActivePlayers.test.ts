import { describe, expect, it } from "vitest";
import { DIVISIONS } from "../lib/divisions";
import { NBA_TEAMS } from "../standingsComposer/teams";
import {
  NBA_ACTIVE_PLAYER_COUNT,
  NBA_ACTIVE_PLAYERS,
  NBA_HEADSHOT_CDN,
  NBA_ROSTER_SOURCE,
  getPlayer,
  searchPlayers,
} from "./nbaActivePlayers";

const POSITIONS = new Set(["PG", "SG", "SF", "PF", "C", "G", "F"]);

describe("active NBA player catalog", () => {
  it("covers every current ESPN roster with CDN headshots and filter fields", () => {
    expect(NBA_ACTIVE_PLAYER_COUNT).toBeGreaterThanOrEqual(450);
    expect(NBA_ACTIVE_PLAYERS).toHaveLength(NBA_ACTIVE_PLAYER_COUNT);
    const teams = new Set(NBA_ACTIVE_PLAYERS.map((player) => player.team));
    expect(teams.size).toBe(NBA_TEAMS.length);
    expect(
      NBA_ACTIVE_PLAYERS.every(
        (player) =>
          player.headshotUrl.startsWith("https://a.espncdn.com/i/headshots/nba/") &&
          Number.isFinite(player.age) &&
          Number.isFinite(player.heightInches) &&
          POSITIONS.has(player.position) &&
          DIVISIONS.includes(player.division),
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
  });

  it("AND-combines team, age, height, division, and position dropdowns", () => {
    const lakers = searchPlayers("", { team: "LAL" });
    expect(lakers.length).toBeGreaterThan(5);
    expect(lakers.every((player) => player.team === "LAL")).toBe(true);

    const veterans = searchPlayers("", { age: "35+" });
    expect(veterans.every((player) => player.age >= 35)).toBe(true);
    expect(veterans.some((player) => player.id === "1966")).toBe(true);

    const sevenFooters = searchPlayers("", { height: "84+" });
    expect(sevenFooters.every((player) => player.heightInches >= 84)).toBe(true);
    expect(sevenFooters.some((player) => player.id === "5104157")).toBe(true);

    const pacific = searchPlayers("", { division: "Pacific" });
    expect(pacific.every((player) => player.division === "Pacific")).toBe(true);

    const pointGuards = searchPlayers("", { position: "PG" });
    expect(pointGuards.every((player) => player.position === "PG")).toBe(true);
    expect(pointGuards.some((player) => player.id === "3975")).toBe(true);

    const pacificGuards = searchPlayers("", {
      division: "Pacific",
      position: "PG",
    });
    expect(pacificGuards.length).toBeGreaterThan(0);
    expect(
      pacificGuards.every(
        (player) => player.division === "Pacific" && player.position === "PG",
      ),
    ).toBe(true);
    expect(pacificGuards.length).toBeLessThan(pointGuards.length);

    const named = searchPlayers("curry", { team: "GSW", position: "PG" });
    expect(named.some((player) => player.id === "3975")).toBe(true);
    expect(searchPlayers("curry", { team: "BOS" })).toHaveLength(0);
  });
});
