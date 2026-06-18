import { describe, expect, it } from "vitest";
import { players } from "./playerPool";
import { getActiveChemistryBonuses, getChemistryAdjustment } from "./chemistry";

describe("chemistry", () => {
  it("awards Nova Knicks bonus for three Villanova Knicks", () => {
    const brunson = players.find((player) => player.bbrPlayerId === "brunsja01");
    const hart = players.find((player) => player.bbrPlayerId === "hartjo01");
    const dante = players.find((player) => player.bbrPlayerId === "divindo01");
    const fillers = players
      .filter(
        (player) =>
          !["brunsja01", "hartjo01", "divindo01"].includes(player.bbrPlayerId ?? ""),
      )
      .slice(0, 2);

    expect(brunson).toBeDefined();
    expect(hart).toBeDefined();
    expect(dante).toBeDefined();

    const lineup = [brunson!, hart!, dante!, ...fillers];
    const bonuses = getActiveChemistryBonuses(lineup);

    expect(bonuses.some((bonus) => bonus.id === "nova-knicks")).toBe(true);
    expect(getChemistryAdjustment(lineup)).toBeGreaterThanOrEqual(10);
  });

  it("awards same-team bonus for three current teammates", () => {
    const knicks = players.filter((player) => player.team === "NYK").slice(0, 3);
    const fillers = players
      .filter((player) => player.team !== "NYK")
      .slice(0, 2);

    const lineup = [...knicks, ...fillers];
    const bonuses = getActiveChemistryBonuses(lineup);

    expect(bonuses.some((bonus) => bonus.id === "same-team-NYK")).toBe(true);
  });
});
