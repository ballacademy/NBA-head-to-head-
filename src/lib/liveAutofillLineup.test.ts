import { describe, expect, it } from "vitest";
import { players } from "./playerPool";
import {
  buildLiveAutofillLineup,
  buildLiveAutofillSeed,
} from "./liveAutofillLineup";
import { RANKED_SALARY_CAP } from "./salaryCap";

describe("liveAutofillLineup", () => {
  it("builds a stable 5-man lineup for the same seed", () => {
    const params = {
      matchId: "match-abc",
      opponentPlayerId: "player-opp",
      players,
      salaryCapLimit: RANKED_SALARY_CAP,
    };

    const first = buildLiveAutofillLineup(params);
    const second = buildLiveAutofillLineup(params);

    expect(first).toHaveLength(5);
    expect(new Set(first).size).toBe(5);
    expect(second).toEqual(first);
    expect(buildLiveAutofillSeed(params.matchId, params.opponentPlayerId)).toContain(
      "match-abc",
    );
  });

  it("changes when the opponent id changes", () => {
    const left = buildLiveAutofillLineup({
      matchId: "match-abc",
      opponentPlayerId: "player-a",
      players,
      salaryCapLimit: RANKED_SALARY_CAP,
    });
    const right = buildLiveAutofillLineup({
      matchId: "match-abc",
      opponentPlayerId: "player-b",
      players,
      salaryCapLimit: RANKED_SALARY_CAP,
    });

    expect(left).not.toEqual(right);
  });
});
