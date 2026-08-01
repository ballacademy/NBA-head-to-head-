import { describe, expect, it } from "vitest";
import {
  ownerResultFromScores,
  persistMatchScore,
} from "../api/match-results";

describe("ownerResultFromScores", () => {
  it("derives owner win/loss/tie from submitted scores", () => {
    expect(ownerResultFromScores(90, 85)).toBe("loss");
    expect(ownerResultFromScores(80, 88)).toBe("win");
    expect(ownerResultFromScores(84.2, 84.2)).toBe("tie");
  });

  it("keeps fractional uncapped OVR matchups from collapsing to ties", () => {
    expect(ownerResultFromScores(104.2, 101.8)).toBe("loss");
    expect(ownerResultFromScores(101.8, 104.2)).toBe("win");
    expect(ownerResultFromScores(100.4, 100.1)).toBe("loss");
  });
});

describe("persistMatchScore", () => {
  it("keeps milli-precision instead of rounding to whole OVR", () => {
    expect(persistMatchScore(104.247)).toBe(104.247);
    expect(persistMatchScore(100.4)).toBe(100.4);
    expect(persistMatchScore(101.9996)).toBe(102);
  });
});
