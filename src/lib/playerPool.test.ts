import { describe, expect, it } from "vitest";
import { isCurrentRookiePlayer } from "./draftClasses";
import {
  ACTIVE_ROSTER_AS_OF,
  ACTIVE_ROSTER_AS_OF_LABEL,
  databasePlayers,
  freeAgentPlayers,
  players,
  statsPlayers,
} from "./playerPool";
import { isDraftEligiblePlayer, isStatsFreeAgent } from "./freeAgents";

describe("playerPool roster metadata", () => {
  it("tracks the active roster as-of date", () => {
    expect(ACTIVE_ROSTER_AS_OF).toBe("2026-08-21");
    expect(ACTIVE_ROSTER_AS_OF_LABEL).toBe("August 21, 2026");
  });
});

describe("playerPool free agents", () => {
  it("includes free agents in the database pool but not draftable rosters", () => {
    expect(freeAgentPlayers.length).toBeGreaterThan(0);
    expect(freeAgentPlayers.every((player) => isStatsFreeAgent(player))).toBe(
      true,
    );
    expect(players.every((player) => isDraftEligiblePlayer(player))).toBe(true);
    expect(players.every((player) => player.gamesPlayed > 0)).toBe(true);
    expect(players.every((player) => typeof player.salary === "number")).toBe(
      true,
    );

    const preseasonRostered = databasePlayers.filter(
      (player) => isDraftEligiblePlayer(player) && player.gamesPlayed === 0,
    );
    expect(preseasonRostered.length).toBeGreaterThan(0);
    expect(databasePlayers.length).toBe(
      players.length + freeAgentPlayers.length + preseasonRostered.length,
    );
  });

  it("keeps upcoming-season rookies out of draft modes and Stats", () => {
    expect(players.some((player) => player.gamesPlayed === 0)).toBe(false);
    expect(statsPlayers.some((player) => player.gamesPlayed === 0)).toBe(false);
    expect(players.some((player) => player.name === "Cameron Boozer")).toBe(
      false,
    );
    expect(statsPlayers.some((player) => player.name === "Cameron Boozer")).toBe(
      false,
    );
    expect(
      databasePlayers.some((player) => player.name === "Cameron Boozer"),
    ).toBe(true);
    expect(
      databasePlayers.filter(isCurrentRookiePlayer).every(
        (player) => player.gamesPlayed === 0,
      ),
    ).toBe(true);
  });

  it("keeps one row per basketball-reference player id", () => {
    const bbrIds = databasePlayers
      .map((player) => player.bbrPlayerId)
      .filter((id): id is string => Boolean(id));

    expect(new Set(bbrIds).size).toBe(bbrIds.length);
  });
});
