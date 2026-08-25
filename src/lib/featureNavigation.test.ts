import { describe, expect, it } from "vitest";
import { isGameReturnPhase } from "./featureNavigation";

describe("featureNavigation", () => {
  it("treats match results as a return target", () => {
    expect(isGameReturnPhase("results")).toBe(true);
    expect(isGameReturnPhase("tierList")).toBe(false);
    expect(isGameReturnPhase(undefined)).toBe(false);
  });
});
