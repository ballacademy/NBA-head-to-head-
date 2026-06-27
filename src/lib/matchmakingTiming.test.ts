import { describe, expect, it } from "vitest";
import {
  getMatchmakingElapsedSeconds,
  MATCHMAKING_SEARCH_MAX_SECONDS,
  MATCHMAKING_SEARCH_MIN_SECONDS,
  resolveMatchmakingSearchMs,
} from "./matchmakingTiming";

describe("matchmakingTiming", () => {
  it("picks a search window between 17 and 20 seconds", () => {
    expect(resolveMatchmakingSearchMs(() => 0)).toBe(
      MATCHMAKING_SEARCH_MIN_SECONDS * 1000,
    );
    expect(resolveMatchmakingSearchMs(() => 0.999)).toBe(
      MATCHMAKING_SEARCH_MAX_SECONDS * 1000,
    );
  });

  it("counts elapsed matchmaking seconds from the start timestamp", () => {
    expect(getMatchmakingElapsedSeconds(1_000, 4_500)).toBe(3);
    expect(getMatchmakingElapsedSeconds(1_000, 999)).toBe(0);
  });
});
