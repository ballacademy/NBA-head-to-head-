import { describe, expect, it } from "vitest";
import { playersById } from "./playerPool";
import { CURRENT_TEAM_OVERRIDES } from "./currentTeamOverrides";

describe("current team overrides", () => {
  it("includes recent ESPN trade updates", () => {
    expect(CURRENT_TEAM_OVERRIDES.randlju01).toBe("BRK");
    expect(CURRENT_TEAM_OVERRIDES.ballla01).toBe("MIN");
    expect(CURRENT_TEAM_OVERRIDES.reidna01).toBe("CHO");
  });

  it("applies synced teams to active player objects", () => {
    const randle = playersById.get("randlju01-brk");
    const lamelo = playersById.get("ballla01-min");

    expect(randle?.team).toBe("BRK");
    expect(lamelo?.team).toBe("MIN");
  });
});
