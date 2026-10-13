import { describe, expect, it } from "vitest";
import { NBA_TEAMS } from "../standingsComposer/teams";
import {
  EVERY_TEAM_CITY,
  EVERY_TEAM_COUNT,
  EVERY_TEAM_ORDER,
  assignPlayer,
  assignPlayerToTeam,
  clearEveryTeamSlot,
  createDefaultRankedOrder,
  createEmptyEveryTeamSlots,
  displayedTeams,
  exportEveryTeamFilename,
  isEveryTeamDraft,
  isEveryTeamSlots,
  nextEmptyEveryTeamSlot,
  normalizeRankedOrder,
  slotIndexForTeam,
  splitEveryTeamTitle,
  swapRankedOrder,
  teamAtSlot,
  usedEveryTeamLabels,
} from "./everyTeamState";
import {
  FIELD_TEXTURE_SRC,
  HEADER_TEXTURE_SRC,
} from "../standingsComposer/headerTexture";
import { everyTeamCellRect, everyTeamGrid } from "./everyTeamLayout";

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
  });
});
