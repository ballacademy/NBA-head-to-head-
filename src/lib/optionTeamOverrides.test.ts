import { describe, expect, it } from "vitest";
import { applyOptionTeamOverride } from "./optionTeamOverrides";

describe("optionTeamOverrides", () => {
  it("assigns option-year teams for players without a current roster team", () => {
    expect(applyOptionTeamOverride("lavinza01", "FA")).toBe("SAC");
    expect(applyOptionTeamOverride("kuminjo01", "GSW")).toBe("ATL");
  });

  it("leaves non-option players unchanged", () => {
    expect(applyOptionTeamOverride("curryst01", "GSW")).toBe("GSW");
    expect(applyOptionTeamOverride(undefined, "LAL")).toBe("LAL");
  });
});
