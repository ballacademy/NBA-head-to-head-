import { describe, expect, it } from "vitest";
import {
  ACTIVE_ROSTER_AS_OF,
  ACTIVE_ROSTER_AS_OF_LABEL,
  databasePlayers,
  freeAgentPlayers,
  players,
} from "./playerPool";
import { isDraftEligiblePlayer, isStatsFreeAgent } from "./freeAgents";

describe("playerPool roster metadata", () => {
  it("tracks the active roster as-of date", () => {
    expect(ACTIVE_ROSTER_AS_OF).toBe("2026-07-06");
    expect(ACTIVE_ROSTER_AS_OF_LABEL).toBe("July 6, 2026");
  });
});

describe("playerPool free agents", () => {
  it("includes free agents in the database pool but not draftable rosters", () => {
    expect(freeAgentPlayers.length).toBeGreaterThan(0);
    expect(freeAgentPlayers.every((player) => isStatsFreeAgent(player))).toBe(
      true,
    );
    expect(players.every((player) => isDraftEligiblePlayer(player))).toBe(true);
    expect(players.every((player) => typeof player.salary === "number")).toBe(
      true,
    );
    expect(databasePlayers.length).toBe(players.length + freeAgentPlayers.length);
  });

  it("keeps one row per basketball-reference player id", () => {
    const bbrIds = databasePlayers
      .map((player) => player.bbrPlayerId)
      .filter((id): id is string => Boolean(id));

    expect(new Set(bbrIds).size).toBe(bbrIds.length);
  });
});
