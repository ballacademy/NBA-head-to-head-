import { describe, expect, it } from "vitest";
import { canStoreLineupForMatchmaking } from "./storedLineups";

/** Mirrors MatchResults skipCompetitiveRecords — private matches must not touch banners. */
const skipsCompetitiveRecords = (options: {
  practiceMode?: boolean;
  privateMatch?: boolean;
}) => Boolean(options.practiceMode || options.privateMatch);

describe("privateMatch lineup storage", () => {
  it("does not store private match lineups for public ghost matchmaking", () => {
    expect(
      canStoreLineupForMatchmaking({
        privateMatch: true,
        salaryCapMode: true,
        lineup: ["a", "b", "c", "d", "e"],
      }),
    ).toBe(false);
  });
});

describe("privateMatch competitive side effects", () => {
  it("skips banners / records / unlocks the same way practice does", () => {
    expect(skipsCompetitiveRecords({ privateMatch: true })).toBe(true);
    expect(skipsCompetitiveRecords({ practiceMode: true })).toBe(true);
    expect(skipsCompetitiveRecords({})).toBe(false);
  });
});
