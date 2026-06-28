import { describe, expect, it } from "vitest";
import {
  isValidStoredLineupIds,
  parseGhostOpponentSnapshot,
  sanitizeStoredLineupIds,
} from "./storedLineups";

describe("storedLineups", () => {
  it("requires five unique non-empty player ids", () => {
    expect(
      isValidStoredLineupIds([
        "a-1",
        "b-2",
        "c-3",
        "d-4",
        "e-5",
      ]),
    ).toBe(true);
    expect(
      isValidStoredLineupIds([
        "a-1",
        "a-1",
        "c-3",
        "d-4",
        "e-5",
      ]),
    ).toBe(false);
    expect(isValidStoredLineupIds(["a-1", "b-2", "c-3", "d-4"])).toBe(false);
  });

  it("drops blank ids from stored lineup payloads", () => {
    expect(
      sanitizeStoredLineupIds([
        "mccolcj01-atl",
        "alexani01-atl",
        "butleji01-gsw",
        "queende01-nop",
        "",
      ]),
    ).toEqual([
      "mccolcj01-atl",
      "alexani01-atl",
      "butleji01-gsw",
      "queende01-nop",
    ]);
  });

  it("rejects ghost opponents without five valid ids", () => {
    expect(
      parseGhostOpponentSnapshot({
        id: "ghost-1",
        teamName: "Test Team",
        lineup: [
          "mccolcj01-atl",
          "alexani01-atl",
          "butleji01-gsw",
          "queende01-nop",
        ],
        elo: 1200,
        createdAt: "2026-06-27T00:00:00.000Z",
      }),
    ).toBeNull();

    expect(
      parseGhostOpponentSnapshot({
        id: "ghost-1",
        teamName: "Test Team",
        lineup: [
          "mccolcj01-atl",
          "alexani01-atl",
          "butleji01-gsw",
          "queende01-nop",
          "giddejo01-chi",
        ],
        elo: 1200,
        createdAt: "2026-06-28T06:00:00.000Z",
      }),
    ).toEqual({
      id: "ghost-1",
      teamName: "Test Team",
      lineup: [
        "mccolcj01-atl",
        "alexani01-atl",
        "butleji01-gsw",
        "queende01-nop",
        "giddejo01-chi",
      ],
      elo: 1200,
      createdAt: "2026-06-28T06:00:00.000Z",
    });
  });
});
