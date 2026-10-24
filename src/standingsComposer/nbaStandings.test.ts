import { describe, expect, it } from "vitest";
import {
  parseConferenceStandingRows,
  parseConferenceStandings,
  recordsFromStandingRows,
  slotsFromTeamIds,
  type EspnStandingsPayload,
} from "./nbaStandings";
import { SLOT_COUNT } from "./rankingState";

const payload = (): EspnStandingsPayload => ({
  children: [
    {
      abbreviation: "East",
      name: "Eastern Conference",
      standings: {
        entries: [
          {
            team: { abbreviation: "BOS" },
            stats: [
              { name: "wins", abbreviation: "W", value: 64 },
              { name: "losses", abbreviation: "L", value: 18 },
              { name: "Last Ten Games", abbreviation: "L10", displayValue: "8-2" },
            ],
          },
          { team: { abbreviation: "NY" } },
          {
            team: { abbreviation: "CLE" },
            stats: [
              { name: "wins", abbreviation: "W", value: 48 },
              { name: "losses", abbreviation: "L", value: 34 },
            ],
          },
        ],
      },
    },
    {
      abbreviation: "West",
      name: "Western Conference",
      standings: {
        entries: [
          { team: { abbreviation: "OKC" } },
          { team: { abbreviation: "DEN" } },
          { team: { abbreviation: "MIN" } },
        ],
      },
    },
  ],
});

describe("NBA standings auto-fill", () => {
  it("reads East and West order from ESPN standings", () => {
    expect(parseConferenceStandings(payload(), "East")).toEqual([
      "BOS",
      "NYK",
      "CLE",
    ]);
    expect(parseConferenceStandings(payload(), "West")).toEqual([
      "OKC",
      "DEN",
      "MIN",
    ]);
    const west = slotsFromTeamIds(parseConferenceStandings(payload(), "West"));
    expect(west).toHaveLength(SLOT_COUNT);
    expect(west[0]).toBe("OKC");
    expect(west[3]).toBeNull();
    const rows = parseConferenceStandingRows(payload(), "East");
    expect(recordsFromStandingRows(rows)).toEqual({
      BOS: { wins: 64, losses: 18, last10: "8-2" },
      CLE: { wins: 48, losses: 34, last10: null },
    });
    expect(rows[1]?.record).toBeNull();
  });
});
