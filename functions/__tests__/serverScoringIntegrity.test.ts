import { describe, expect, it } from "vitest";
import { players } from "../../src/lib/playerPool";
import { calculateLineupScore } from "../../src/lib/scoring";
import {
  resolveLineupPlayers,
  scoreLineupIds,
} from "../lib/lineupScoring";
import { computeDailySubmissionValue } from "../lib/dailyScoreCompute";
import { validateEventLineupIds } from "../lib/eventLineupValidation";
import {
  filterPlayersForEventRestriction,
  getCurrentWeeklyEvent,
} from "../../src/lib/weeklyEvents";

describe("lineupScoring", () => {
  it("resolves known lineup ids and scores uncappedTotal", () => {
    const lineup = players.slice(0, 5).map((player) => player.id);
    const resolved = resolveLineupPlayers(lineup);
    expect(resolved).not.toBeNull();
    expect(resolved!).toHaveLength(5);

    const score = scoreLineupIds(lineup);
    expect(score).not.toBeNull();
    expect(score).toBe(calculateLineupScore(resolved!).uncappedTotal);
  });

  it("returns null when any player id is missing", () => {
    const lineup = [
      ...players.slice(0, 4).map((player) => player.id),
      "missing-player-id-xyz",
    ];
    expect(resolveLineupPlayers(lineup)).toBeNull();
    expect(scoreLineupIds(lineup)).toBeNull();
  });
});

describe("dailyScoreCompute", () => {
  it("computes value and formattedResult for a valid goal lineup", () => {
    const lineup = players.slice(0, 5).map((player) => player.id);
    const result = computeDailySubmissionValue("splash-zone", lineup);
    expect(result).not.toBeNull();
    expect(Number.isFinite(result!.value)).toBe(true);
    expect(result!.formattedResult.length).toBeGreaterThan(0);
  });

  it("returns null for unknown goal or missing players", () => {
    const lineup = players.slice(0, 5).map((player) => player.id);
    expect(computeDailySubmissionValue("not-a-real-goal", lineup)).toBeNull();
    expect(
      computeDailySubmissionValue("splash-zone", [
        ...lineup.slice(0, 4),
        "missing-player-id-xyz",
      ]),
    ).toBeNull();
  });
});

describe("eventLineupValidation", () => {
  it("accepts eligible event players when a weekly event is active", () => {
    const event = getCurrentWeeklyEvent(players);
    expect(event).not.toBeNull();
    const pool = filterPlayersForEventRestriction(players, event!.restriction);
    const lineup = pool.slice(0, 5).map((player) => player.id);
    expect(validateEventLineupIds(lineup)).toBeNull();
  });

  it("rejects players outside the event restriction pool", () => {
    const event = getCurrentWeeklyEvent(players);
    expect(event).not.toBeNull();
    const allowed = new Set(
      filterPlayersForEventRestriction(players, event!.restriction).map(
        (player) => player.id,
      ),
    );
    const ineligible = players.find((player) => !allowed.has(player.id));
    expect(ineligible).toBeDefined();
    const pool = filterPlayersForEventRestriction(players, event!.restriction);
    const lineup = [
      ...pool.slice(0, 4).map((player) => player.id),
      ineligible!.id,
    ];
    expect(validateEventLineupIds(lineup)).toMatch(/not eligible/i);
  });
});
