import { describe, expect, it } from "vitest";
import { findPlayerId, players } from "./playerPool";
import {
  canStoreLineupForMatchmaking,
  isValidStoredLineupIds,
  MAX_STORED_OPPONENT_STAR_GAP,
  parseGhostOpponentSnapshot,
  sanitizeStoredLineupIds,
} from "./storedLineups";
import { getLineupSalaryTotal, RANKED_SALARY_CAP } from "./salaryCap";

const lineupPlayers = (names: string[]) =>
  names.map((name) => {
    const player = players.find((entry) => entry.id === findPlayerId(name));
    if (!player) {
      throw new Error(`missing ${name}`);
    }
    return player;
  });

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

  it("excludes practice, all-time, and daily drafts from matchmaking storage", () => {
    const lineup = ["a", "b", "c", "d", "e"];

    expect(
      canStoreLineupForMatchmaking({
        lineup,
      }),
    ).toBe(true);
    expect(
      canStoreLineupForMatchmaking({
        lineup,
        practiceMode: true,
      }),
    ).toBe(false);
    expect(
      canStoreLineupForMatchmaking({
        lineup,
        allTimeMode: true,
      }),
    ).toBe(false);
    expect(
      canStoreLineupForMatchmaking({
        lineup,
        isDailyDraft: true,
      }),
    ).toBe(false);
    expect(
      canStoreLineupForMatchmaking({
        lineup: lineup.slice(0, 4),
      }),
    ).toBe(false);
  });

  it("rejects ranked lineups that exceed the $100M salary cap", () => {
    const overCap = lineupPlayers([
      "Cade Cunningham",
      "Shai Gilgeous-Alexander",
      "Kawhi Leonard",
      "DeMar DeRozan",
      "Jarrett Allen",
    ]);

    expect(getLineupSalaryTotal(overCap)).toBeGreaterThan(RANKED_SALARY_CAP);
    expect(
      canStoreLineupForMatchmaking({
        lineup: overCap.map((player) => player.id),
        players: overCap,
        salaryCapMode: true,
      }),
    ).toBe(false);
    expect(MAX_STORED_OPPONENT_STAR_GAP).toBe(6);
  });
});
