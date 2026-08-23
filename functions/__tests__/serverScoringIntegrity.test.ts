import { describe, expect, it } from "vitest";
import {
  getDailyDateKey,
  getDailyDraftSetup,
} from "../../src/lib/dailyDraft";
import { filterPlayersForSlot } from "../../src/lib/draft";
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
    const dateKey = getDailyDateKey();
    const setup = getDailyDraftSetup(dateKey, "basic");
    const picked = new Set<string>();
    const lineup: string[] = [];
    for (const slot of setup.slots) {
      const candidate = filterPlayersForSlot(players, slot, picked)[0];
      expect(candidate).toBeTruthy();
      lineup.push(candidate!.id);
      picked.add(candidate!.id);
    }

    const result = computeDailySubmissionValue(
      dateKey,
      "basic",
      setup.goal.id,
      lineup,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(Number.isFinite(result.value)).toBe(true);
    expect(result.formattedResult.length).toBeGreaterThan(0);
  });

  it("returns errors for unknown goal, duplicates, or missing players", () => {
    const dateKey = getDailyDateKey();
    const setup = getDailyDraftSetup(dateKey, "basic");
    const lineup = players.slice(0, 5).map((player) => player.id);

    expect(
      computeDailySubmissionValue(dateKey, "basic", "not-a-real-goal", lineup)
        .ok,
    ).toBe(false);
    expect(
      computeDailySubmissionValue(dateKey, "basic", setup.goal.id, [
        ...lineup.slice(0, 4),
        "missing-player-id-xyz",
      ]).ok,
    ).toBe(false);
    expect(
      computeDailySubmissionValue(dateKey, "basic", setup.goal.id, [
        lineup[0]!,
        lineup[0]!,
        lineup[1]!,
        lineup[2]!,
        lineup[3]!,
      ]).ok,
    ).toBe(false);
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
    const pool = filterPlayersForEventRestriction(players, event!.restriction);
    const allowed = new Set(pool.map((player) => player.id));
    const ineligible = players.find((player) => !allowed.has(player.id));
    // Full-pool weeks (blind / bargain / agepos) have no in-roster ineligible
    // players — use a fake id so the validator still rejects.
    const outsiderId = ineligible?.id ?? "not-eligible-for-event-xyz";
    const lineup = [
      ...pool.slice(0, 4).map((player) => player.id),
      outsiderId,
    ];
    expect(validateEventLineupIds(lineup)).toMatch(/not eligible/i);
  });
});
