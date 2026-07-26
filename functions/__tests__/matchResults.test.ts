import { describe, expect, it } from "vitest";
import { ownerResultFromScores } from "../api/match-results";

describe("ownerResultFromScores", () => {
  it("derives owner win/loss/tie from submitted scores", () => {
    expect(ownerResultFromScores(90, 85)).toBe("loss");
    expect(ownerResultFromScores(80, 88)).toBe("win");
    expect(ownerResultFromScores(84.2, 84.2)).toBe("tie");
  });
});
