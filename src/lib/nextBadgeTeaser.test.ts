import { getAchievementProgress } from "./achievements";
import { getNextBadgeTeaser } from "./nextBadgeTeaser";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./achievements", async () => {
  const actual = await vi.importActual<typeof import("./achievements")>(
    "./achievements",
  );
  return {
    ...actual,
    evaluateCareerProgressAchievements: vi.fn(() => ({
      newlyUnlocked: [],
    })),
    getAchievementProgress: vi.fn(),
  };
});

describe("nextBadgeTeaser", () => {
  beforeEach(() => {
    vi.mocked(getAchievementProgress).mockReturnValue({
      unlocked: 0,
      total: 10,
      careerProgress: [
        {
          id: "ten-drafts",
          title: "Ten Drafts",
          description: "Complete 10 drafts",
          emoji: "📝",
          current: 2,
          target: 10,
          isUnlocked: false,
        },
      ],
      achievements: [],
      special: { achievements: [], unlocked: 0, total: 0 },
    } as ReturnType<typeof getAchievementProgress>);
  });

  it("returns nearest locked career badge with play hint", () => {
    const teaser = getNextBadgeTeaser();
    expect(teaser?.id).toBe("ten-drafts");
    expect(teaser?.description).toContain("2/10");
    expect(teaser?.hint.playSection).toBe("headToHead");
  });
});
