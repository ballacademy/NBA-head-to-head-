import { describe, expect, it } from "vitest";
import {
  buildPlayHubChips,
  formatPlayHubDailyStreakLabel,
  getPlayNavBadgeCount,
} from "./playHubRetention";
import type { DailyDraftPlayStreak } from "./dailyDraftPlayStreak";

const streak = (
  mode: "basic" | "advanced",
  current: number,
): DailyDraftPlayStreak => ({
  mode,
  current,
  lastPlayedDateKey: current > 0 ? "2026-08-18" : null,
  active: current > 0,
});

describe("playHubRetention", () => {
  it("counts pending results and queued lineups for the Play badge", () => {
    expect(
      getPlayNavBadgeCount({
        pendingResultCount: 2,
        queuedClassic: true,
        queuedRanked: false,
      }),
    ).toBe(3);
    expect(
      getPlayNavBadgeCount({
        pendingResultCount: 0,
        queuedClassic: false,
        queuedRanked: false,
      }),
    ).toBe(0);
  });

  it("formats the stronger Daily streak and hides empty streaks", () => {
    expect(
      formatPlayHubDailyStreakLabel(streak("basic", 3), streak("advanced", 1)),
    ).toBe("Basic 3-day streak");
    expect(
      formatPlayHubDailyStreakLabel(streak("basic", 0), streak("advanced", 2)),
    ).toBe("Adv 2-day streak");
    expect(
      formatPlayHubDailyStreakLabel(streak("basic", 0), streak("advanced", 0)),
    ).toBeNull();
  });

  it("prioritizes inbox, recap, and next badge on the Play strip", () => {
    const chips = buildPlayHubChips({
      pendingResultCount: 1,
      queuedClassic: true,
      queuedRanked: false,
      recapReady: true,
      recapDetail: "Daily Draft · last week",
      nextBadgeTitle: "10 Drafts",
      nextBadgePlaySection: "headToHead",
      nextBadgeH2hMode: "classic",
      dailyStreakLabel: "Basic 3-day streak",
    });

    expect(chips.map((chip) => chip.id)).toEqual(["inbox", "recap", "badge"]);
    expect(chips[1]).toMatchObject({
      label: "Weekly recap",
      detail: "Daily Draft · last week",
      ctaLabel: "Go",
      action: { type: "recap" },
    });
    expect(chips[0]).toMatchObject({
      label: "1 result ready",
      action: { type: "inbox" },
    });
  });

  it("shows a queued-lineup chip when no results are waiting", () => {
    const chips = buildPlayHubChips({
      pendingResultCount: 0,
      queuedClassic: false,
      queuedRanked: true,
      recapReady: false,
      dailyStreakLabel: "Adv 1-day streak",
    });

    expect(chips[0]).toMatchObject({
      id: "inbox",
      label: "Lineup queued",
      action: { type: "h2h" },
    });
    expect(chips.some((chip) => chip.id === "streak")).toBe(true);
  });

  it("omits the recap chip when recapReady is false", () => {
    const chips = buildPlayHubChips({
      pendingResultCount: 0,
      queuedClassic: false,
      queuedRanked: false,
      recapReady: false,
    });

    expect(chips.some((chip) => chip.id === "recap")).toBe(false);
  });

  it("skips the Daily streak chip when the next badge is already Daily", () => {
    const chips = buildPlayHubChips({
      pendingResultCount: 0,
      queuedClassic: false,
      queuedRanked: false,
      recapReady: false,
      nextBadgeTitle: "3-Day Streak",
      nextBadgeIsDaily: true,
      nextBadgePlaySection: "daily",
      dailyStreakLabel: "Basic 2-day streak",
    });

    expect(chips).toHaveLength(1);
    expect(chips[0]?.action).toEqual({ type: "play", playSection: "daily" });
  });
});
