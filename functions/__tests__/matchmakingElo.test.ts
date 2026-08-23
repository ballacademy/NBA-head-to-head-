import { describe, expect, it } from "vitest";
import { GUEST_RANKED_ELO_CAP } from "../../src/lib/rankedElo";
import { clampClientMatchmakingElo } from "../lib/matchmakingElo";

describe("matchmakingElo", () => {
  it("clamps extreme client Elo into the safe range", () => {
    expect(clampClientMatchmakingElo(-50)).toBe(0);
    expect(clampClientMatchmakingElo(9999)).toBe(4000);
    expect(clampClientMatchmakingElo(1499.6)).toBe(1500);
  });

  it("keeps the guest ranked cap below live-only threshold", () => {
    expect(GUEST_RANKED_ELO_CAP).toBe(1499);
    expect(
      Math.min(clampClientMatchmakingElo(1800), GUEST_RANKED_ELO_CAP),
    ).toBe(GUEST_RANKED_ELO_CAP);
  });
});
