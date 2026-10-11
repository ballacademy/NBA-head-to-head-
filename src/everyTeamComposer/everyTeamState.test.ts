import { describe, expect, it } from "vitest";
import { NBA_TEAMS } from "../standingsComposer/teams";
import {
  EVERY_TEAM_CITY,
  EVERY_TEAM_COUNT,
  EVERY_TEAM_ORDER,
  assignPlayer,
  clearEveryTeamSlot,
  createEmptyEveryTeamSlots,
  exportEveryTeamFilename,
  isEveryTeamSlots,
  splitEveryTeamTitle,
  teamAtSlot,
} from "./everyTeamState";
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
});
