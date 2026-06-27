import { describe, expect, it } from "vitest";
import { players } from "./playerPool";
import { applyPositionOverride } from "./positionOverrides";

describe("positionOverrides", () => {
  it("returns the override list when one exists", () => {
    expect(applyPositionOverride("curryst01", ["PG", "SG"])).toEqual(["PG"]);
    expect(applyPositionOverride("thompam01", ["PG", "SG"])).toEqual([
      "PG",
      "SG",
      "SF",
    ]);
  });

  it("keeps computed positions when no override exists", () => {
    expect(applyPositionOverride("doncilu01", ["PG", "SG"])).toEqual([
      "PG",
      "SG",
    ]);
    expect(applyPositionOverride(undefined, ["SF", "PF"])).toEqual(["SF", "PF"]);
  });

  it("applies manual overrides to the player pool", () => {
    const curry = players.find((player) => player.bbrPlayerId === "curryst01");
    const amen = players.find((player) => player.bbrPlayerId === "thompam01");
    const mcCollum = players.find((player) => player.bbrPlayerId === "mccolcj01");

    expect(curry?.positions).toEqual(["PG"]);
    expect(amen?.positions).toEqual(["PG", "SG", "SF"]);
    expect(mcCollum?.position).toBe("SG");
    expect(mcCollum?.positions).toEqual(["SG", "PG"]);
  });
});
