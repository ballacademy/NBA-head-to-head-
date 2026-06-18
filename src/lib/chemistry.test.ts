import { describe, expect, it } from "vitest";
import { players } from "./playerPool";
import {
  COLLEGE_TEAMMATE_BONUS_THREE_PLUS,
  COUSIN_CHEMISTRY_BONUS,
  FULL_ROSTER_TEAM_BONUS,
  getActiveChemistryBonuses,
  getChemistryAdjustment,
} from "./chemistry";

describe("chemistry", () => {
  it("awards college teammates bonus for three Villanova teammates", () => {
    const brunson = players.find((player) => player.bbrPlayerId === "brunsja01");
    const hart = players.find((player) => player.bbrPlayerId === "hartjo01");
    const dante = players.find((player) => player.bbrPlayerId === "divindo01");
    const fillers = players
      .filter(
        (player) =>
          !["brunsja01", "hartjo01", "divindo01"].includes(player.bbrPlayerId ?? ""),
      )
      .slice(0, 2);

    const lineup = [brunson!, hart!, dante!, ...fillers];
    const bonuses = getActiveChemistryBonuses(lineup);

    expect(bonuses.some((bonus) => bonus.id === "college-villanova-2015s")).toBe(
      true,
    );
    expect(bonuses.find((bonus) => bonus.id === "college-villanova-2015s")?.bonus).toBe(
      COLLEGE_TEAMMATE_BONUS_THREE_PLUS,
    );
  });

  it("awards cousin bonus for SGA and Nickeil Alexander-Walker", () => {
    const shai = players.find((player) => player.bbrPlayerId === "gilgesh01");
    const naw = players.find((player) => player.bbrPlayerId === "alexani01");
    const fillers = players
      .filter(
        (player) =>
          !["gilgesh01", "alexani01"].includes(player.bbrPlayerId ?? ""),
      )
      .slice(0, 3);

    const lineup = [shai!, naw!, ...fillers];
    const bonuses = getActiveChemistryBonuses(lineup);

    expect(bonuses.some((bonus) => bonus.id === "cousins-sga-naw-cousins")).toBe(
      true,
    );
    expect(getChemistryAdjustment(lineup)).toBeGreaterThanOrEqual(
      COUSIN_CHEMISTRY_BONUS,
    );
  });

  it("awards verified Williams brothers but not unrelated Williams players", () => {
    const jalen = players.find((player) => player.bbrPlayerId === "willija06");
    const cody = players.find((player) => player.bbrPlayerId === "willico04");
    const jaylin = players.find((player) => player.bbrPlayerId === "willija07");
    const fillers = players
      .filter(
        (player) =>
          !["willija06", "willico04", "willija07"].includes(
            player.bbrPlayerId ?? "",
          ),
      )
      .slice(0, 2);

    const brotherLineup = [jalen!, cody!, ...fillers];
    const unrelatedLineup = [jalen!, jaylin!, ...fillers];

    expect(
      getActiveChemistryBonuses(brotherLineup).some(
        (bonus) => bonus.id === "brothers-williams-brothers",
      ),
    ).toBe(true);
    expect(
      getActiveChemistryBonuses(unrelatedLineup).some(
        (bonus) => bonus.id === "brothers-williams-brothers",
      ),
    ).toBe(false);
  });

  it("caps same-team bonus at eight for a full roster", () => {
    const team = players[0]!.team;
    const sameTeam = players.filter((player) => player.team === team).slice(0, 5);

    if (sameTeam.length < 5) {
      return;
    }

    const bonuses = getActiveChemistryBonuses(sameTeam);
    const sameTeamBonus = bonuses.find((bonus) => bonus.id === `same-team-${team}`);

    expect(sameTeamBonus?.bonus).toBe(FULL_ROSTER_TEAM_BONUS);
  });
});
