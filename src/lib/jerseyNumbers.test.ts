import { describe, expect, it } from "vitest";
import { databasePlayers, players } from "./playerPool";
import { lookupJerseyNumber } from "./jerseyNumbers";
import jerseyData from "../../data/nba-jersey-numbers.json";

describe("jerseyNumbers", () => {
  it("returns roster numbers when available", () => {
    expect(lookupJerseyNumber("duranke01", "duranke01-hou", "HOU")).toBe(7);
  });

  it("falls back to a stable jersey number when missing", () => {
    const first = lookupJerseyNumber(undefined, "missing-player-id", "LAL");
    const second = lookupJerseyNumber(undefined, "missing-player-id", "LAL");

    expect(first).toBeGreaterThanOrEqual(0);
    expect(first).toBeLessThan(100);
    expect(second).toBe(first);
  });

  it("covers the player database with fresh roster numbers", () => {
    const byPlayerId = (
      jerseyData as {
        byPlayerId: Record<string, { jerseyNumber: number; team: string }>;
      }
    ).byPlayerId;

    let covered = 0;
    let mismatched = 0;

    for (const player of databasePlayers) {
      if (!player.bbrPlayerId) {
        continue;
      }

      const entry = byPlayerId[player.bbrPlayerId];
      if (!entry) {
        continue;
      }

      covered += 1;
      const lookedUp = lookupJerseyNumber(
        player.bbrPlayerId,
        player.id,
        player.team,
      );
      if (lookedUp !== entry.jerseyNumber) {
        mismatched += 1;
      }

      expect(player.jerseyNumber).toBe(lookedUp);
    }

    expect(covered).toBeGreaterThan(500);
    expect(mismatched).toBe(0);
    expect(players.length).toBeGreaterThan(300);
  });

  it("keeps known star numbers after the roster refresh", () => {
    expect(lookupJerseyNumber("doncilu01", "doncilu01-lal", "LAL")).toBe(77);
    expect(lookupJerseyNumber("edwaran01", "edwaran01-min", "MIN")).toBe(5);
    expect(lookupJerseyNumber("curryst01", "curryst01-gsw", "GSW")).toBe(30);
    expect(lookupJerseyNumber("wembavi01", "wembavi01-sas", "SAS")).toBe(1);
    expect(lookupJerseyNumber("tatumja01", "tatumja01-bos", "BOS")).toBe(0);
  });
});
