import { describe, expect, it } from "vitest";
import { playersById } from "./playerPool";
import { CURRENT_TEAM_OVERRIDES } from "./currentTeamOverrides";

describe("current team overrides", () => {
  it("includes recent ESPN trade updates", () => {
    expect(CURRENT_TEAM_OVERRIDES.randlju01).toBe("BRK");
    expect(CURRENT_TEAM_OVERRIDES.ballla01).toBe("MIN");
    expect(CURRENT_TEAM_OVERRIDES.reidna01).toBe("CHO");
    expect(CURRENT_TEAM_OVERRIDES.grantje01).toBe("MEM");
    expect(CURRENT_TEAM_OVERRIDES.moranja01).toBe("POR");
    expect(CURRENT_TEAM_OVERRIDES.leonaka01).toBe("TOR");
    expect(CURRENT_TEAM_OVERRIDES.ingrabr01).toBe("LAC");
    expect(CURRENT_TEAM_OVERRIDES.dickgr01).toBe("LAC");
    expect(CURRENT_TEAM_OVERRIDES.hardati02).toBe("MIA");
  });

  it("applies synced teams to active player objects", () => {
    const randle = playersById.get("randlju01-brk");
    const lamelo = playersById.get("ballla01-min");
    const grant = playersById.get("grantje01-mem");
    const morant = playersById.get("moranja01-por");
    const kawhi = playersById.get("leonaka01-tor");
    const ingram = playersById.get("ingrabr01-lac");
    const hardaway = playersById.get("hardati02-mia");

    expect(randle?.team).toBe("BRK");
    expect(lamelo?.team).toBe("MIN");
    expect(grant?.team).toBe("MEM");
    expect(morant?.team).toBe("POR");
    expect(kawhi?.team).toBe("TOR");
    expect(ingram?.team).toBe("LAC");
    expect(hardaway?.team).toBe("MIA");
    expect(hardaway?.salary).toBe(6_500_000);
  });
});
