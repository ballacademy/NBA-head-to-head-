import { describe, expect, it } from "vitest";
import { formatOpponentDisplayName } from "./opponentDisplayName";

describe("formatOpponentDisplayName", () => {
  it("returns the team name alone when there is no username", () => {
    expect(formatOpponentDisplayName("Bulls")).toBe("Bulls");
    expect(formatOpponentDisplayName("Bulls", null)).toBe("Bulls");
    expect(formatOpponentDisplayName("Bulls", "  ")).toBe("Bulls");
  });

  it("appends @username when the opponent has an account", () => {
    expect(formatOpponentDisplayName("Bulls", "ace_gm")).toBe("Bulls · @ace_gm");
  });
});
