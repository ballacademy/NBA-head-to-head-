import { describe, expect, it } from "vitest";
import { canOpenOpponentGmProfile } from "./opponentGmProfile";

describe("canOpenOpponentGmProfile", () => {
  it("allows competitive live and ghost profile ids", () => {
    expect(
      canOpenOpponentGmProfile({
        profilePlayerId: "p_abcdef1234567890abcdef12",
      }),
    ).toBe(true);
    expect(
      canOpenOpponentGmProfile({
        profilePlayerId: "11111111-2222-3333-4444-555555555555",
      }),
    ).toBe(true);
  });

  it("allows private-match opponents with a real profile id", () => {
    expect(
      canOpenOpponentGmProfile({
        profilePlayerId: "player-friend-1",
      }),
    ).toBe(true);
  });

  it("blocks practice, events, and synthetic ids", () => {
    expect(
      canOpenOpponentGmProfile({
        profilePlayerId: "player-1",
        practiceMode: true,
      }),
    ).toBe(false);
    expect(
      canOpenOpponentGmProfile({
        profilePlayerId: "player-1",
        eventId: "evt-1",
      }),
    ).toBe(false);
    expect(
      canOpenOpponentGmProfile({ profilePlayerId: "npc-ranked-3" }),
    ).toBe(false);
    expect(canOpenOpponentGmProfile({ profilePlayerId: null })).toBe(false);
  });
});
