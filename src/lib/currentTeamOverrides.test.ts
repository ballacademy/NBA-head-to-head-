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
    // Kawhi ↔ Ingram swap (Clippers / Raptors).
    expect(CURRENT_TEAM_OVERRIDES.leonaka01).toBe("TOR");
    expect(CURRENT_TEAM_OVERRIDES.ingrabr01).toBe("LAC");
    expect(CURRENT_TEAM_OVERRIDES.dickgr01).toBe("LAC");
    expect(CURRENT_TEAM_OVERRIDES.hardati02).toBe("MIA");
    expect(CURRENT_TEAM_OVERRIDES.antetgi01).toBe("MIA");
    expect(CURRENT_TEAM_OVERRIDES.brownja02).toBe("PHI");
    expect(CURRENT_TEAM_OVERRIDES.georgpa01).toBe("BOS");
    expect(CURRENT_TEAM_OVERRIDES.postqu01).toBe("MEM");
    expect(CURRENT_TEAM_OVERRIDES.middlkh01).toBe("WAS");
    expect(CURRENT_TEAM_OVERRIDES.willizi02).toBe("LAL");
    expect(CURRENT_TEAM_OVERRIDES.nancela02).toBe("IND");
    // Oct 2026 camp / two-way moves.
    expect(CURRENT_TEAM_OVERRIDES.agbajoc01).toBe("NYK");
    expect(CURRENT_TEAM_OVERRIDES.brownbr01).toBe("NYK");
    expect(CURRENT_TEAM_OVERRIDES.nembhry01).toBe("DEN");
    expect(CURRENT_TEAM_OVERRIDES.hieldbu01).toBe("CHI");
    expect(CURRENT_TEAM_OVERRIDES.mathube01).toBe("NOP");
  });

  it("applies synced teams to active player objects", () => {
    const randle = playersById.get("randlju01-brk");
    const lamelo = playersById.get("ballla01-min");
    const grant = playersById.get("grantje01-mem");
    const morant = playersById.get("moranja01-por");
    const kawhi = playersById.get("leonaka01-tor");
    const ingram = playersById.get("ingrabr01-lac");
    const hardaway = playersById.get("hardati02-mia");
    const post = playersById.get("postqu01-mem");
    const duren = playersById.get("durenja01-det");
    const mathurin = playersById.get("mathube01-nop");

    expect(randle?.team).toBe("BRK");
    expect(lamelo?.team).toBe("MIN");
    expect(grant?.team).toBe("MEM");
    expect(morant?.team).toBe("POR");
    expect(kawhi?.team).toBe("TOR");
    expect(ingram?.team).toBe("LAC");
    expect(hardaway?.team).toBe("MIA");
    expect(hardaway?.salary).toBe(6_500_000);
    expect(post?.team).toBe("MEM");
    expect(post?.salary).toBe(8_285_714);
    expect(duren?.team).toBe("DET");
    expect(duren?.salary).toBe(40_160_000);
    expect(mathurin?.team).toBe("NOP");
    expect(mathurin?.salary).toBe(7_500_000);
  });
});
