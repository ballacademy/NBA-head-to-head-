import { describe, expect, it } from "vitest";
import { canStoreLineupForMatchmaking } from "./storedLineups";

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
