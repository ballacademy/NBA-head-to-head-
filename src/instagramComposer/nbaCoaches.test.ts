import { describe, expect, it } from "vitest";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import { NBA_COACHES, getCoach, isCoachId } from "./nbaCoaches";

describe("nba coaches catalog", () => {
  it("lists 30 head coaches as picker rows", () => {
    expect(NBA_COACHES).toHaveLength(30);
    expect(new Set(NBA_COACHES.map((coach) => coach.team)).size).toBe(30);
    const kerr = NBA_COACHES.find((coach) => coach.team === "GSW");
    expect(kerr?.name).toMatch(/kerr/i);
    expect(kerr?.role).toBe("coach");
    expect(isCoachId(kerr?.id)).toBe(true);
    expect(getCoach(kerr?.id)?.name).toBe(kerr?.name);
    expect(getPlayer(kerr!.id)?.role).toBe("coach");
  });
});
