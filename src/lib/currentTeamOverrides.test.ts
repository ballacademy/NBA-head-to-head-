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
    // Kawhi-TOR trade remains on hold pending Aspiration investigation.
    expect(CURRENT_TEAM_OVERRIDES.leonaka01).toBe("LAC");
    expect(CURRENT_TEAM_OVERRIDES.ingrabr01).toBe("TOR");
    expect(CURRENT_TEAM_OVERRIDES.dickgr01).toBe("TOR");
    expect(CURRENT_TEAM_OVERRIDES.hardati02).toBe("MIA");
    expect(CURRENT_TEAM_OVERRIDES.antetgi01).toBe("MIA");
    expect(CURRENT_TEAM_OVERRIDES.brownja02).toBe("PHI");
    expect(CURRENT_TEAM_OVERRIDES.georgpa01).toBe("BOS");
    expect(CURRENT_TEAM_OVERRIDES.postqu01).toBe("MEM");
    expect(CURRENT_TEAM_OVERRIDES.middlkh01).toBe("WAS");
    expect(CURRENT_TEAM_OVERRIDES.willizi02).toBe("LAL");
    expect(CURRENT_TEAM_OVERRIDES.nancela02).toBe("IND");
  });

  it("applies synced teams to active player objects", () => {
    const randle = playersById.get("randlju01-brk");
    const lamelo = playersById.get("ballla01-min");
    const grant = playersById.get("grantje01-mem");
    const morant = playersById.get("moranja01-por");
    const kawhi = playersById.get("leonaka01-lac");
    const ingram = playersById.get("ingrabr01-tor");
    const hardaway = playersById.get("hardati02-mia");
    const post = playersById.get("postqu01-mem");

    expect(randle?.team).toBe("BRK");
    expect(lamelo?.team).toBe("MIN");
    expect(grant?.team).toBe("MEM");
    expect(morant?.team).toBe("POR");
    expect(kawhi?.team).toBe("LAC");
    expect(ingram?.team).toBe("TOR");
    expect(hardaway?.team).toBe("MIA");
    expect(hardaway?.salary).toBe(6_500_000);
    expect(post?.team).toBe("MEM");
    expect(post?.salary).toBe(10_000_000);
  });
});
