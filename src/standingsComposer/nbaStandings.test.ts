import { describe, expect, it } from "vitest";
import {
  parseConferenceStandingRows,
  parseConferenceStandings,
  recordsFromStandingRows,
  slotsFromStandingRows,
  slotsFromTeamIds,
  type EspnStandingsPayload,
} from "./nbaStandings";
import {
  SLOT_COUNT,
  formatStandingLast10,
  formatStandingRecord,
  insertRankingSlots,
  standingRecordForTeam,
} from "./rankingState";

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

  it("fills East and West in playoff seed order, not ESPN payload order", () => {
    const scrambled: EspnStandingsPayload = {
      children: [
        {
          abbreviation: "East",
          name: "Eastern Conference",
          standings: {
            entries: [
              {
                team: { abbreviation: "NY" },
                stats: [
                  { name: "wins", abbreviation: "W", value: 0 },
                  { name: "losses", abbreviation: "L", value: 2 },
                  { name: "playoffSeed", abbreviation: "SEED", value: 12 },
                  { name: "Last Ten Games", abbreviation: "L10", displayValue: "0-2" },
                ],
              },
              {
                team: { abbreviation: "BOS" },
                stats: [
                  { name: "wins", abbreviation: "W", value: 1 },
                  { name: "losses", abbreviation: "L", value: 1 },
                  { name: "playoffSeed", abbreviation: "SEED", value: 7 },
                  { name: "Last Ten Games", abbreviation: "L10", displayValue: "1-1" },
                ],
              },
              {
                team: { abbreviation: "ATL" },
                stats: [
                  { name: "wins", abbreviation: "W", value: 2 },
                  { name: "losses", abbreviation: "L", value: 0 },
                  { name: "playoffSeed", abbreviation: "SEED", value: 1 },
                  { name: "Last Ten Games", abbreviation: "L10", displayValue: "2-0" },
                ],
              },
            ],
          },
        },
      ],
    };
    const rows = parseConferenceStandingRows(scrambled, "East");
    expect(rows.map((row) => row.id)).toEqual(["ATL", "BOS", "NYK"]);
    expect(rows.map((row) => row.seed)).toEqual([1, 7, 12]);
    const slots = slotsFromStandingRows(rows);
    expect(slots[0]).toBe("ATL");
    expect(slots[6]).toBe("BOS");
    expect(slots[11]).toBe("NYK");
    const records = recordsFromStandingRows(rows);
    expect(formatStandingRecord(standingRecordForTeam(records, slots[0]))).toBe(
      "2–0",
    );
    expect(formatStandingRecord(standingRecordForTeam(records, slots[6]))).toBe(
      "1–1",
    );
    expect(formatStandingLast10(standingRecordForTeam(records, slots[11]))).toBe(
      "0–2",
    );
    const moved = insertRankingSlots(slots, 0, 2);
    expect(moved[2]).toBe("ATL");
    expect(formatStandingRecord(standingRecordForTeam(records, moved[2]))).toBe(
      "2–0",
    );
    expect(formatStandingRecord(standingRecordForTeam(records, moved[0]))).toBeNull();
  });

  it("reads W–L from wins/losses, not last-10 or a leftover slot", () => {
    const payload: EspnStandingsPayload = {
      children: [
        {
          abbreviation: "East",
          name: "Eastern Conference",
          standings: {
            entries: [
              {
                team: { abbreviation: "CLE" },
                stats: [
                  { name: "Last Ten Games", abbreviation: "L10", displayValue: "8-2" },
                  { name: "overall", abbreviation: "Total", displayValue: "48-34" },
                  { name: "wins", abbreviation: "W", value: 48 },
                  { name: "losses", abbreviation: "L", value: 34 },
                ],
              },
            ],
          },
        },
      ],
    };
    const rows = parseConferenceStandingRows(payload, "East");
    expect(rows[0]?.record).toEqual({
      wins: 48,
      losses: 34,
      last10: "8-2",
    });
  });
});
