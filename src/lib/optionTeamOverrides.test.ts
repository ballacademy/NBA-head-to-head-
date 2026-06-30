import { describe, expect, it } from "vitest";
import { applyOptionTeamOverride } from "./optionTeamOverrides";

describe("optionTeamOverrides", () => {
  it("assigns option-year teams for players without a current roster team", () => {
    expect(applyOptionTeamOverride("lavinza01", "FA")).toBe("SAC");
    expect(applyOptionTeamOverride("poeltja01", "TOR")).toBe("TOR");
  });

  it("leaves non-option players unchanged", () => {
    expect(applyOptionTeamOverride("curryst01", "GSW")).toBe("GSW");
    expect(applyOptionTeamOverride(undefined, "LAL")).toBe("LAL");
  });

  it("does not override teams already synced from ESPN trades", () => {
    expect(applyOptionTeamOverride("dickgr01", "LAC")).toBe("LAC");
    expect(applyOptionTeamOverride("leonaka01", "TOR")).toBe("TOR");
  });
});
