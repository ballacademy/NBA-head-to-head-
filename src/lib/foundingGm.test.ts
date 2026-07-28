import { describe, expect, it, vi } from "vitest";
import {
  FOUNDING_GM_ACCOUNT_LIMIT,
  FOUNDING_GM_ACHIEVEMENT_ID,
  isFoundingGmSignupIndex,
  syncFoundingGmAchievement,
} from "./foundingGm";
import { ACHIEVEMENT_CHECKS } from "./achievementChecks";
import { checkLineupAchievements, loadAchievementState } from "./achievements";
import { players } from "./playerPool";

describe("foundingGm", () => {
  it("marks only the first 500 signup indexes as founding", () => {
    expect(isFoundingGmSignupIndex(1)).toBe(true);
    expect(isFoundingGmSignupIndex(FOUNDING_GM_ACCOUNT_LIMIT)).toBe(true);
    expect(isFoundingGmSignupIndex(FOUNDING_GM_ACCOUNT_LIMIT + 1)).toBe(false);
    expect(isFoundingGmSignupIndex(null)).toBe(false);
    expect(isFoundingGmSignupIndex(undefined)).toBe(false);
  });

  it("defines a server-granted Founding GM badge that lineups cannot unlock", () => {
    const badge = ACHIEVEMENT_CHECKS.find(
      (achievement) => achievement.id === FOUNDING_GM_ACHIEVEMENT_ID,
    );

    expect(badge).toBeDefined();
    expect(badge?.title).toBe("Founding GM");
    expect(checkLineupAchievements(players.slice(0, 5))).not.toContain(
      FOUNDING_GM_ACHIEVEMENT_ID,
    );
  });

  it("unlocks the Founding GM badge when the account is eligible", () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      clear: () => storage.clear(),
    });

    expect(syncFoundingGmAchievement(false).newlyUnlocked).toEqual([]);
    expect(loadAchievementState().unlocked).not.toContain(
      FOUNDING_GM_ACHIEVEMENT_ID,
    );

    expect(syncFoundingGmAchievement(true).newlyUnlocked).toEqual([
      FOUNDING_GM_ACHIEVEMENT_ID,
    ]);
    expect(loadAchievementState().unlocked).toContain(
      FOUNDING_GM_ACHIEVEMENT_ID,
    );
    expect(syncFoundingGmAchievement(true).newlyUnlocked).toEqual([]);

    vi.unstubAllGlobals();
  });
});
