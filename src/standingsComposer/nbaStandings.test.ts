import { describe, expect, it } from "vitest";
import {
  parseConferenceStandings,
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
          { team: { abbreviation: "BOS" } },
          { team: { abbreviation: "NY" } },
          { team: { abbreviation: "CLE" } },
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
  });
});
