import { describe, expect, it } from "vitest";
import { DIVISIONS } from "../lib/divisions";
import { NBA_TEAMS } from "../standingsComposer/teams";
import {
  ALL_STAR_FILTER,
  INTERNATIONAL_FILTER,
  LOTTERY_FILTER,
  NBA_ACTIVE_PLAYER_COUNT,
  NBA_ACTIVE_PLAYERS,
  NBA_HEADSHOT_CDN,
  NBA_ROSTER_SOURCE,
  NEVER_ALL_STAR_FILTER,
  NON_LOTTERY_FILTER,
  UNDRAFTED_FILTER,
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
    expect(
      NBA_ACTIVE_PLAYERS.every(
        (player) =>
          (player.draftYear == null || Number.isFinite(player.draftYear)) &&
          (player.country == null || player.country.length > 1) &&
          Number.isFinite(player.experienceYears) &&
          typeof player.allStar === "boolean" &&
          (player.conference === "East" || player.conference === "West"),
      ),
    ).toBe(true);
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

    const knicks = searchPlayers("", { team: "NYK" });
    expect(knicks.length).toBeGreaterThan(5);
    expect(knicks.every((player) => player.team === "NYK")).toBe(true);
    expect(knicks.some((player) => player.team === "BKN")).toBe(false);
  });

  it("filters All-Star, conference, country, experience, draft class, and lottery", () => {
    const allStars = searchPlayers("", { allStar: ALL_STAR_FILTER });
    expect(allStars.length).toBeGreaterThan(20);
    expect(allStars.every((player) => player.allStar)).toBe(true);
    expect(allStars.some((player) => player.id === "1966")).toBe(true);
    expect(allStars.some((player) => player.id === "3112335")).toBe(true);

    const never = searchPlayers("", { allStar: NEVER_ALL_STAR_FILTER });
    expect(never.every((player) => !player.allStar)).toBe(true);
    expect(never.length + allStars.length).toBe(NBA_ACTIVE_PLAYER_COUNT);

    const west = searchPlayers("", { conference: "West" });
    expect(west.length).toBeGreaterThan(100);
    expect(west.every((player) => player.conference === "West")).toBe(true);

    const serbia = searchPlayers("", { country: "Serbia" });
    expect(serbia.some((player) => player.id === "3112335")).toBe(true);
    expect(serbia.every((player) => player.country === "Serbia")).toBe(true);

    const international = searchPlayers("", { country: INTERNATIONAL_FILTER });
    expect(international.every((player) => player.country !== "United States")).toBe(
      true,
    );
    expect(international.length).toBeGreaterThan(20);

    const vets = searchPlayers("", { experience: "11+" });
    expect(vets.every((player) => player.experienceYears >= 11)).toBe(true);
    expect(vets.some((player) => player.id === "1966")).toBe(true);

    const class2014 = searchPlayers("", { draftClass: "2014" });
    expect(class2014.every((player) => player.draftYear === 2014)).toBe(true);
    expect(class2014.some((player) => player.id === "3112335")).toBe(true);

    const lottery = searchPlayers("", { draftStatus: LOTTERY_FILTER });
    expect(
      lottery.every(
        (player) => player.draftRound === 1 && (player.draftPick ?? 99) <= 14,
      ),
    ).toBe(true);
    expect(lottery.some((player) => player.id === "1966")).toBe(true);

    const undrafted = searchPlayers("", { draftStatus: UNDRAFTED_FILTER });
    expect(undrafted.every((player) => player.draftYear == null)).toBe(true);
    expect(undrafted.length).toBeGreaterThan(10);

    const nonLottery = searchPlayers("", { draftStatus: NON_LOTTERY_FILTER });
    expect(
      nonLottery.every(
        (player) =>
          player.draftYear != null &&
          !(player.draftRound === 1 && (player.draftPick ?? 99) <= 14),
      ),
    ).toBe(true);

    const westAllStars = searchPlayers("", {
      conference: "West",
      allStar: ALL_STAR_FILTER,
    });
    expect(westAllStars.length).toBeGreaterThan(0);
    expect(
      westAllStars.every(
        (player) => player.conference === "West" && player.allStar,
      ),
    ).toBe(true);
    expect(westAllStars.length).toBeLessThan(allStars.length);
  });
});
