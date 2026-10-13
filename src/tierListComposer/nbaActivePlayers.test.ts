import { describe, expect, it } from "vitest";
import { DIVISIONS } from "../lib/divisions";
import { NBA_TEAMS } from "../standingsComposer/teams";
import {
  AGE_SPAN,
  ALL_STAR_FILTER,
  EMPTY_PLAYER_FILTERS,
  EXPERIENCE_SPAN,
  HEIGHT_SPAN,
  INTERNATIONAL_FILTER,
  LOTTERY_FILTER,
  NBA_ACTIVE_PLAYER_COUNT,
  NBA_ACTIVE_PLAYERS,
  NBA_HEADSHOT_CDN,
  NBA_HEADSHOT_FALLBACKS,
  NBA_ROSTER_SOURCE,
  NEVER_ALL_STAR_FILTER,
  NON_LOTTERY_FILTER,
  PLAYER_SCORING_SEASON,
  PLAYER_SCORING_SOURCE,
  UNDRAFTED_FILTER,
  getPlayer,
  isComposerHeadshotUrl,
  isEmptyPlayerFilters,
  parsePlayerPickerSort,
  parsePlayerSearchFilters,
  searchPlayers,
  sortPlayers,
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
          isComposerHeadshotUrl(player.headshotUrl) &&
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
          Number.isFinite(player.ppg) &&
          (player.conference === "East" || player.conference === "West"),
      ),
    ).toBe(true);
  });

  it("uses a previous-team or college shot when the NBA ESPN PNG 404s", () => {
    const payton = getPlayer("4066354");
    expect(payton?.name).toBe("Payton Pritchard");
    expect(payton?.headshotUrl).toBe(
      "https://a.espncdn.com/i/headshots/nba/players/full/4066354.png",
    );

    const corhen = getPlayer("4712902");
    expect(corhen?.name).toBe("Cameron Corhen");
    expect(corhen?.headshotUrl).toContain("mens-college-basketball");

    const anthony = getPlayer("4897155");
    expect(anthony?.name).toBe("Anthony Pritchard");
    expect(anthony?.headshotUrl).toContain("mens-college-basketball");

    expect(getPlayer("4997530")?.headshotUrl).toBe("/composer-headshots/4997530.png");
    expect(getPlayer("4684737")?.headshotUrl).toBe("/composer-headshots/4684737.png");

    const solved = NBA_HEADSHOT_FALLBACKS.filter(
      (row) => row.source !== "nba-espn-missing",
    );
    expect(solved.length).toBeGreaterThanOrEqual(14);
    expect(
      NBA_HEADSHOT_FALLBACKS.some(
        (row) => row.name === "Phillip Wheeler" && row.source === "nba-espn-missing",
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

  it("AND-combines team, age, height, division, and position filters", () => {
    const lakers = searchPlayers("", { team: "LAL" });
    expect(lakers.length).toBeGreaterThan(5);
    expect(lakers.every((player) => player.team === "LAL")).toBe(true);

    const veterans = searchPlayers("", { ageRange: { min: 35, max: AGE_SPAN.max } });
    expect(veterans.every((player) => player.age >= 35)).toBe(true);
    expect(veterans.some((player) => player.id === "1966")).toBe(true);

    const ages2123 = searchPlayers("", { ageRange: { min: 21, max: 23 } });
    expect(ages2123.every((player) => player.age >= 21 && player.age <= 23)).toBe(
      true,
    );
    expect(ages2123.length).toBeGreaterThan(0);
    expect(ages2123.length).toBeLessThan(NBA_ACTIVE_PLAYER_COUNT);

    const sevenFooters = searchPlayers("", {
      heightRange: { min: 84, max: HEIGHT_SPAN.max },
    });
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

    const vets = searchPlayers("", {
      experienceRange: { min: 11, max: EXPERIENCE_SPAN.max },
    });
    expect(vets.every((player) => player.experienceYears >= 11)).toBe(true);
    expect(vets.some((player) => player.id === "1966")).toBe(true);

    const young = searchPlayers("", { experienceRange: { min: 0, max: 2 } });
    expect(young.every((player) => player.experienceYears <= 2)).toBe(true);
    expect(young.length).toBeGreaterThan(0);

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

  it("sorts the picker by 2025-26 Basketball-Reference PPG, then by name", () => {
    expect(PLAYER_SCORING_SEASON).toBe("2025-26");
    expect(PLAYER_SCORING_SOURCE).toContain("basketball-reference.com");
    expect(PLAYER_SCORING_SOURCE).toContain("NBA_2026_per_game");

    const luka = getPlayer("3945274");
    const shai = getPlayer("4278073");
    expect(luka?.ppg).toBe(33.5);
    expect(shai?.ppg).toBe(31.1);
    expect(NBA_ACTIVE_PLAYERS.filter((player) => player.ppg > 0).length).toBeGreaterThan(
      450,
    );

    const byPoints = sortPlayers(NBA_ACTIVE_PLAYERS, "points");
    expect(byPoints[0]?.id).toBe("3945274");
    expect(byPoints[1]?.id).toBe("4278073");
    for (let index = 1; index < byPoints.length; index += 1) {
      expect(byPoints[index - 1].ppg).toBeGreaterThanOrEqual(byPoints[index].ppg);
    }

    const byName = sortPlayers(NBA_ACTIVE_PLAYERS, "name");
    expect(byName[0]?.name.localeCompare(byName[1]?.name ?? "")).toBeLessThanOrEqual(0);
    expect(parsePlayerPickerSort("points")).toBe("points");
    expect(parsePlayerPickerSort("name")).toBe("name");
    expect(parsePlayerPickerSort("depth")).toBe("depth");
    expect(parsePlayerPickerSort("nope")).toBe("name");
  });

  it("round-trips range filters and treats full spans as cleared", () => {
    expect(isEmptyPlayerFilters(EMPTY_PLAYER_FILTERS)).toBe(true);
    const stored = parsePlayerSearchFilters({
      team: "BOS",
      ageRange: { min: 21, max: 25 },
      heightRange: { min: 78, max: 81 },
      experienceRange: { min: 1, max: 4 },
    });
    expect(stored.team).toBe("BOS");
    expect(stored.ageRange).toEqual({ min: 21, max: 25 });
    expect(stored.heightRange).toEqual({ min: 78, max: 81 });
    expect(stored.experienceRange).toEqual({ min: 1, max: 4 });
    expect(isEmptyPlayerFilters(stored)).toBe(false);
    expect(isEmptyPlayerFilters(parsePlayerSearchFilters({}))).toBe(true);
  });
});
