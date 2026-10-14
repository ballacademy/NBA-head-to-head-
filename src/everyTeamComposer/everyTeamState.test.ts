import { describe, expect, it } from "vitest";
import { NBA_TEAMS } from "../standingsComposer/teams";
import {
  EVERY_TEAM_CITY,
  EVERY_TEAM_COUNT,
  EVERY_TEAM_ORDER,
  assignPlayer,
  assignPlayerToTeam,
  autoFillEveryTeamSlots,
  autoSortRankedOrder,
  rankedMetricValues,
  clearEveryTeamSlot,
  createDefaultRankedOrder,
  createEmptyEveryTeamSlots,
  displayedTeams,
  exportEveryTeamFilename,
  isEveryTeamDraft,
  isEveryTeamSlots,
  nextEmptyEveryTeamSlot,
  normalizeRankedOrder,
  pruneSlotsToSeasons,
  slotIndexForTeam,
  splitEveryTeamTitle,
  insertRankedOrder,
  swapRankedOrder,
  teamAtSlot,
  usedEveryTeamLabels,
} from "./everyTeamState";
import catalog from "../../data/every-team-historical-rosters.json";
import {
  hydrateEveryTeamRosters,
  listRosterPlayers,
  pickSeasonLeader,
  rosterAsTierPlayers,
  rosterStatValue,
  seasonForTeam,
  setCellSeason,
  statsSeasonFor,
  teamLogoSrc,
} from "./historicalRosters";
import { sortPlayers } from "../tierListComposer/nbaActivePlayers";

hydrateEveryTeamRosters(
  catalog as unknown as Parameters<typeof hydrateEveryTeamRosters>[0],
);
import {
  FIELD_TEXTURE_SRC,
  HEADER_TEXTURE_SRC,
} from "../standingsComposer/headerTexture";
import {
  ET_RANK_BADGE_H,
  ET_RANK_SIZE,
  everyTeamCellRect,
  everyTeamGrid,
} from "./everyTeamLayout";

const EXPECTED_CITIES = [
  "Atlanta",
  "Boston",
  "Brooklyn",
  "Charlotte",
  "Chicago",
  "Cleveland",
  "Dallas",
  "Denver",
  "Detroit",
  "Golden State",
  "Houston",
  "Indiana",
  "LA Clippers",
  "Los Angeles Lakers",
  "Memphis",
  "Miami",
  "Milwaukee",
  "Minnesota",
  "New Orleans",
  "New York",
  "Oklahoma City",
  "Orlando",
  "Philadelphia",
  "Phoenix",
  "Portland",
  "Sacramento",
  "San Antonio",
  "Toronto",
  "Utah",
  "Washington",
];

describe("every-team order and slots", () => {
  it("places all 30 clubs in alphabetical city order, including the Knicks", () => {
    expect(EVERY_TEAM_COUNT).toBe(30);
    expect(EVERY_TEAM_ORDER).toHaveLength(30);
    expect(NBA_TEAMS).toHaveLength(30);
    expect(EVERY_TEAM_ORDER.map((team) => EVERY_TEAM_CITY[team.id])).toEqual(
      EXPECTED_CITIES,
    );
    expect(teamAtSlot(19)?.id).toBe("NYK");
    expect(teamAtSlot(12)?.id).toBe("LAC");
    expect(teamAtSlot(13)?.id).toBe("LAL");
    expect(new Set(EVERY_TEAM_ORDER.map((team) => team.id)).size).toBe(30);
  });

  it("assigns and clears a player on a fixed team slot", () => {
    const empty = createEmptyEveryTeamSlots();
    expect(isEveryTeamSlots(empty)).toBe(true);
    expect(empty.every((slot) => slot === null)).toBe(true);
    const filled = assignPlayer(empty, 13, "3945274");
    expect(filled[13]).toBe("3945274");
    expect(assignPlayer(filled, 0, "3945274")[13]).toBeNull();
    expect(assignPlayer(filled, 0, "3945274")[0]).toBe("3945274");
    expect(clearEveryTeamSlot(filled, 13)[13]).toBeNull();
  });

  it("splits titles into two balanced lines and names the PNG", () => {
    const lines = splitEveryTeamTitle(
      "MOST DISAPPOINTING PLAYER ON EVERY NBA TEAM",
    );
    expect(lines).toHaveLength(2);
    expect(`${lines[0]} ${lines[1]}`).toBe(
      "MOST DISAPPOINTING PLAYER ON EVERY NBA TEAM",
    );
    expect(splitEveryTeamTitle("BEST PLAYER")).toEqual(["BEST", "PLAYER"]);
    expect(exportEveryTeamFilename("MOST DISAPPOINTING PLAYER ON EVERY NBA TEAM")).toBe(
      "most-disappointing-player-on-every-nba-team.png",
    );
    const empty = createEmptyEveryTeamSlots();
    empty[0] = "1";
    empty[2] = "2";
    expect(nextEmptyEveryTeamSlot(empty, 0)).toBe(1);
    expect(nextEmptyEveryTeamSlot(empty, 1)).toBe(3);
    expect(usedEveryTeamLabels(empty, 0)["1"]).toBe("This slot");
    expect(usedEveryTeamLabels(empty, 0)["2"]).toBe(teamAtSlot(2)?.id);
  });

  it("lays out a 5×6 square grid", () => {
    const grid = everyTeamGrid(1);
    expect(grid.cols * grid.rows).toBe(30);
    expect(grid.cell).toBeGreaterThan(160);
    expect(ET_RANK_SIZE).toBeLessThan(22);
    expect(ET_RANK_BADGE_H).toBeLessThan(grid.cell * 0.22);
    const first = everyTeamCellRect(0, grid);
    const second = everyTeamCellRect(1, grid);
    const sixth = everyTeamCellRect(5, grid);
    expect(second.x).toBe(first.x + grid.cell + grid.gap);
    expect(sixth.y).toBe(first.y + grid.cell + grid.gap);
    expect(first.size).toBe(grid.cell);
  });

  it("uses the stacked metal as the true board field", () => {
    expect(FIELD_TEXTURE_SRC).toBe("/composer-background-texture.png");
    expect(HEADER_TEXTURE_SRC).toBe(FIELD_TEXTURE_SRC);
  });

  it("keeps unranked alphabetical and swaps ranked order without moving numbers", () => {
    const order = createDefaultRankedOrder();
    expect(order[0]).toBe("ATL");
    expect(displayedTeams(false)[0]?.id).toBe("ATL");
    expect(displayedTeams(false)[19]?.id).toBe("NYK");
    const swapped = swapRankedOrder(order, 0, 19);
    expect(swapped[0]).toBe("NYK");
    expect(swapped[19]).toBe("ATL");
    expect(displayedTeams(true, swapped)[0]?.id).toBe("NYK");
    expect(displayedTeams(true, swapped)[19]?.id).toBe("ATL");
    expect(displayedTeams(false, swapped)[0]?.id).toBe("ATL");
    const slots = assignPlayerToTeam(createEmptyEveryTeamSlots(), "NYK", "1966");
    expect(slots[19]).toBe("1966");
    expect(assignPlayerToTeam(slots, "ATL", "1966")[19]).toBeNull();
    expect(normalizeRankedOrder(["NYK", "LAL", "NYK", "NOPE"])[0]).toBe("NYK");
    expect(normalizeRankedOrder(["NYK"]).length).toBe(30);
    expect(
      isEveryTeamDraft({
        brand: "BALLACADEMY",
        title: "EVERY TEAM",
        slots: createEmptyEveryTeamSlots(),
      }),
    ).toBe(true);
    const empty = createEmptyEveryTeamSlots();
    empty[19] = "1966";
    expect(nextEmptyEveryTeamSlot(empty, 0, true, swapped)).toBe(1);
    expect(slotIndexForTeam("NYK")).toBe(19);
    expect(swapRankedOrder(order, 3, 3)).toEqual(order);
    const up = insertRankedOrder(order, 7, 2);
    expect(up[2]).toBe(order[7]);
    expect(up[3]).toBe(order[2]);
    expect(up[7]).toBe(order[6]);
    expect(up[8]).toBe(order[8]);
    const down = insertRankedOrder(order, 2, 7);
    expect(down[7]).toBe(order[2]);
    expect(down[2]).toBe(order[3]);
    expect(insertRankedOrder(order, 4, 4)).toEqual(order);
  });

  it("keeps 2012-13 OKC on ESPN starter PG–C then backups, with real season stats", () => {
    const okc = listRosterPlayers("OKC", "2012-13");
    expect(okc[0]).toMatchObject({
      name: "Russell Westbrook",
      position: "PG",
      depth: 1,
      pts: 23.2,
    });
    expect(okc.slice(0, 5).map((player) => `${player.depth}${player.position}`)).toEqual(
      ["1PG", "1SG", "1SF", "1PF", "1C"],
    );
    expect(okc.slice(0, 5).map((player) => player.name)).toEqual([
      "Russell Westbrook",
      "Thabo Sefolosha",
      "Kevin Durant",
      "Serge Ibaka",
      "Kendrick Perkins",
    ]);
    expect(okc[5]?.depth).toBe(2);
    expect(okc[5]?.position).toBe("PG");
    const durant = okc.find((player) => player.name === "Kevin Durant");
    expect(rosterStatValue(durant ?? null, "pra")).toBe(40.6);
    expect(
      sortPlayers(rosterAsTierPlayers("OKC", "2012-13"), "depth")
        .slice(0, 5)
        .map((player) => player.name),
    ).toEqual([
      "Russell Westbrook",
      "Thabo Sefolosha",
      "Kevin Durant",
      "Serge Ibaka",
      "Kendrick Perkins",
    ]);
  });

  it("uses SuperSonics for 2001-02 OKC and marks Charlotte 2002-03 missing", () => {
    const sonics = listRosterPlayers("OKC", "2001-02");
    expect(sonics.some((player) => player.name === "Gary Payton")).toBe(true);
    expect(sonics[0]?.position).toBe("PG");
    expect(listRosterPlayers("CHA", "2002-03")).toEqual([]);
    expect(listRosterPlayers("NOP", "2001-02")).toEqual([]);
    expect(listRosterPlayers("CHA", "2001-02").some((player) => player.name === "Baron Davis")).toBe(
      true,
    );
  });

  it("prunes players who are not on a cell’s season roster", () => {
    const westbrook =
      listRosterPlayers("OKC", "2012-13").find((player) => player.name === "Russell Westbrook")
        ?.id ?? "";
    const slots = assignPlayerToTeam(createEmptyEveryTeamSlots(), "OKC", westbrook);
    expect(pruneSlotsToSeasons(slots, "2012-13")[slotIndexForTeam("OKC")]).toBe(westbrook);
    expect(pruneSlotsToSeasons(slots, "2026-27")[slotIndexForTeam("OKC")]).toBeNull();
    const override = setCellSeason({}, "OKC", "2012-13", "2026-27");
    expect(seasonForTeam("OKC", "2026-27", override)).toBe("2012-13");
    expect(
      pruneSlotsToSeasons(slots, "2026-27", override)[slotIndexForTeam("OKC")],
    ).toBe(westbrook);
  });

  it("lists 2026-27 Knicks and Magic extras after depth units, with live averages", () => {
    const knicks = listRosterPlayers("NYK", "2026-27");
    const brown = knicks.find((player) => player.id === "4065670");
    expect(brown?.name).toBe("Bruce Brown");
    expect(brown?.depth).toBeGreaterThanOrEqual(99);
    const lastDepth = Math.max(
      ...knicks.filter((player) => player.depth < 99).map((player) => player.depth),
      0,
    );
    expect(brown?.depth).toBeGreaterThan(lastDepth);
    const depthSorted = sortPlayers(rosterAsTierPlayers("NYK", "2026-27"), "depth");
    const brownAt = depthSorted.findIndex((player) => player.id === "4065670");
    const lastSlotted = depthSorted.reduce(
      (index, player, at) => ((player.depth ?? 99) < 99 ? at : index),
      -1,
    );
    expect(brownAt).toBeGreaterThan(lastSlotted);
    const magic = listRosterPlayers("ORL", "2026-27");
    const branham = magic.find((player) => player.id === "4565201");
    expect(branham?.name).toBe("Malaki Branham");
    expect(branham?.depth).toBeGreaterThanOrEqual(99);
    const scored = knicks.filter((player) => player.pts != null).length;
    expect(scored).toBeGreaterThan(8);
    expect(rosterStatValue(knicks.find((player) => player.pts != null) ?? null, "pra")).not.toBeNull();
  });

  it("uses 2025-26 stats on the current season until that year has a real table", () => {
    expect(statsSeasonFor("2026-27")).toBe("2025-26");
    expect(statsSeasonFor("2012-13")).toBe("2012-13");
    const sga = listRosterPlayers("OKC", "2026-27").find(
      (player) => player.id === "4278073",
    );
    expect(sga?.pts).toBe(31.1);
    expect(rosterStatValue(sga ?? null, "points")).toBe(31.1);
    expect(pickSeasonLeader("OKC", "2026-27", "points")?.id).toBe("4278073");
    expect(pickSeasonLeader("OKC", "2025-26", "points")?.name).toBe(
      "Shai Gilgeous-Alexander",
    );
    const filled = autoFillEveryTeamSlots("2026-27", {}, "points");
    expect(filled[slotIndexForTeam("OKC")]).toBe("4278073");
    expect(filled.filter(Boolean).length).toBeGreaterThan(20);
    expect(teamLogoSrc("OKC", "2001-02", false)).toContain("OKC");
    expect(teamLogoSrc("OKC", "2001-02", true)).toContain("SEA");
    expect(teamLogoSrc("BKN", "2011-12", true)).toContain("NJN");
    expect(teamLogoSrc("OKC", "2025-26", true)).toContain("OKC");
  });

  it("auto-sorts 2026-27 starter PGs by PRA using last season’s table", () => {
    const order = createDefaultRankedOrder();
    const values = order.map((teamId) => {
      const pg = listRosterPlayers(teamId, "2026-27").find(
        (player) => player.position === "PG" && player.depth === 1,
      );
      return rosterStatValue(pg ?? null, "pra");
    });
    const scored = values.filter((value) => value != null).length;
    expect(scored).toBeGreaterThan(20);
    const result = autoSortRankedOrder(order, values);
    expect(result.ranked).toBe(scored);
    expect(result.order).not.toEqual(order);
    expect(result.order.slice(0, result.ranked)).not.toEqual(order.slice(0, result.ranked));
  });

  it("auto-sorts ranked order by PRA and keeps missing stats in original order at the bottom", () => {
    const order = ["OKC", "LAL", "MIA", "BOS"];
    const result = autoSortRankedOrder(order.concat(createDefaultRankedOrder()).slice(0, 30), [
      40.6, null, 35.1, 22.0,
    ]);
    expect(result.order.slice(0, 3)).toEqual(["OKC", "MIA", "BOS"]);
    expect(result.order[3]).toBe("LAL");
    expect(result.ranked).toBe(3);
    expect(result.held).toBe(27);
    const unchanged = autoSortRankedOrder(createDefaultRankedOrder(), Array(30).fill(null));
    expect(unchanged.order).toEqual(createDefaultRankedOrder());
    expect(unchanged.ranked).toBe(0);
  });

  it("borrows last-season stats for 2026-27 team-switchers", () => {
    const powell = listRosterPlayers("CHI", "2026-27").find(
      (player) => player.name === "Norman Powell",
    );
    expect(powell?.pts).toBe(21.7);
    const giannis = listRosterPlayers("MIA", "2026-27").find((player) =>
      /Antetokounmpo/i.test(player.name),
    );
    expect(giannis?.pts).toBe(27.6);
    expect(pickSeasonLeader("MIA", "2026-27", "points")?.name).toMatch(
      /Antetokounmpo/i,
    );
    expect(pickSeasonLeader("CHI", "2026-27", "points")?.name).toBe(
      "Norman Powell",
    );
  });

  it("reorders 2026-27 auto-fill by PRA, points, and STL+BLK", () => {
    const order = createDefaultRankedOrder();
    const sortFilled = (metric: "pra" | "points" | "stocks") => {
      const slots = autoFillEveryTeamSlots("2026-27", {}, metric);
      return autoSortRankedOrder(
        order,
        rankedMetricValues(order, slots, "2026-27", {}, metric),
      );
    };
    const pra = sortFilled("pra");
    const points = sortFilled("points");
    const stocks = sortFilled("stocks");
    expect(pra.ranked).toBe(30);
    expect(points.ranked).toBe(30);
    expect(stocks.ranked).toBe(30);
    expect(pra.order).not.toEqual(order);
    expect(points.order).not.toEqual(pra.order);
    expect(stocks.order).not.toEqual(points.order);
    expect(stocks.order).not.toEqual(pra.order);
  });
});
