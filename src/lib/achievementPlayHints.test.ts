import { describe, expect, it } from "vitest";
import {
  ACHIEVEMENT_PLAY_HINTS,
  getAchievementPlayHint,
  getNearestLockedAchievement,
  PRIORITY_ACHIEVEMENT_IDS,
} from "./achievementPlayHints";

describe("achievementPlayHints", () => {
  it("routes poverty-line to casual classic H2H", () => {
    expect(ACHIEVEMENT_PLAY_HINTS["poverty-line"]).toMatchObject({
      playSection: "headToHead",
      h2hMode: "classic",
    });
    expect(getAchievementPlayHint("poverty-line").h2hMode).toBe("classic");
  });

  it("routes daily streak career badges to Daily Draft", () => {
    expect(getAchievementPlayHint("daily-streak-3")).toMatchObject({
      playSection: "daily",
      ctaLabel: "Play Daily Draft",
    });
  });

  it("routes chemistry badges to Casual Head to Head", () => {
    expect(getAchievementPlayHint("family-ties").h2hMode).toBe("classic");
    expect(getAchievementPlayHint("college-roommates").playSection).toBe(
      "headToHead",
    );
  });

  it("prefers priority locked badges before other locked badges", () => {
    const achievements = [
      {
        id: "founding-gm",
        title: "Founding GM",
        description: "",
        emoji: "🏀",
        isUnlocked: false,
      },
      {
        id: "rebuild",
        title: "Rebuild",
        description: "",
        emoji: "🔨",
        isUnlocked: false,
      },
      {
        id: "eighty-ovr",
        title: "80 OVR",
        description: "",
        emoji: "⭐",
        isUnlocked: false,
      },
      {
        id: "ballin-on-budget",
        title: "Ballin on a Budget",
        description: "",
        emoji: "💰",
        isUnlocked: false,
      },
    ];

    expect(getNearestLockedAchievement(achievements)?.id).toBe(
      "ballin-on-budget",
    );
    expect(PRIORITY_ACHIEVEMENT_IDS).toContain("eighty-ovr");
  });

  it("skips founding-gm when choosing the nearest locked badge", () => {
    const achievements = [
      {
        id: "founding-gm",
        title: "Founding GM",
        description: "",
        emoji: "🏀",
        isUnlocked: false,
      },
      {
        id: "rebuild",
        title: "Rebuild",
        description: "",
        emoji: "🔨",
        isUnlocked: false,
      },
    ];

    expect(getNearestLockedAchievement(achievements)?.id).toBe("rebuild");
  });
});
