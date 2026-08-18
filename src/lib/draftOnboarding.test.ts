import { describe, expect, it } from "vitest";
import { getDraftOnboardingBullets } from "./draftOnboarding";

describe("getDraftOnboardingBullets", () => {
  it("covers Daily hidden stats and auto-fill", () => {
    const bullets = getDraftOnboardingBullets({
      hasSalaryCap: false,
      isDailyDraft: true,
      isCompetitive: false,
    });
    expect(bullets.some((line) => /hidden/i.test(line))).toBe(true);
    expect(bullets.some((line) => /auto-fill/i.test(line))).toBe(true);
    expect(bullets.some((line) => /LeBron/i.test(line))).toBe(false);
  });

  it("covers cap, Banners, and competitive LeBron ban", () => {
    const bullets = getDraftOnboardingBullets({
      hasSalaryCap: true,
      isDailyDraft: false,
      isCompetitive: true,
    });
    expect(bullets.some((line) => /salary cap/i.test(line))).toBe(true);
    expect(bullets.some((line) => /Banners/i.test(line))).toBe(true);
    expect(bullets.some((line) => /LeBron/i.test(line))).toBe(true);
  });

  it("skips LeBron and Banners in practice-style drafts", () => {
    const bullets = getDraftOnboardingBullets({
      hasSalaryCap: true,
      isDailyDraft: false,
      isCompetitive: false,
    });
    expect(bullets.some((line) => /LeBron/i.test(line))).toBe(false);
    expect(bullets.some((line) => /Banners/i.test(line))).toBe(false);
  });
});
