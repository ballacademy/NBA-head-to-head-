import { describe, expect, it } from "vitest";
import {
  getHighBannerQueueLockNote,
  getHighBannerQueuedWaitCopy,
  getHighBannerSearchWaitMessage,
} from "./highBannerQueueWait";
import { LIVE_OPPONENT_ONLY_MIN_ELO, RATING_LABEL } from "./rankedElo";

describe("highBannerQueueWait", () => {
  it("escalates search wait copy as elapsed time grows", () => {
    expect(getHighBannerSearchWaitMessage(0)).toMatch(/live opponent \(any rating\)/i);
    expect(getHighBannerSearchWaitMessage(0)).toContain(
      `${LIVE_OPPONENT_ONLY_MIN_ELO}+ ${RATING_LABEL}`,
    );
    expect(getHighBannerSearchWaitMessage(12)).toMatch(/thin/i);
    expect(getHighBannerSearchWaitMessage(30)).toMatch(/cancel/i);
  });

  it("explains queued wait with practice tip", () => {
    const copy = getHighBannerQueuedWaitCopy({
      ratingPointsLabel: `1600 ${RATING_LABEL}`,
    });
    expect(copy.body).toContain("1600");
    expect(copy.body).toMatch(/any rating/i);
    expect(copy.tip).toMatch(/Practice and Private/i);
  });

  it("softens landing queue lock note", () => {
    expect(getHighBannerQueueLockNote(" (Pro)")).toMatch(/Practice and Private/i);
    expect(getHighBannerQueueLockNote(" (Pro)")).toMatch(/any rating/i);
  });
});
