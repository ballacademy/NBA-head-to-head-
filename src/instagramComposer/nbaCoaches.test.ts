import { describe, expect, it } from "vitest";
import {
  POSITION_FILTERS,
  getPlayer,
  searchPlayers,
} from "../tierListComposer/nbaActivePlayers";
import { NBA_COACHES, getCoach, isCoachId, withCoaches } from "./nbaCoaches";

describe("nba coaches catalog", () => {
  it("lists 30 head coaches as picker rows", () => {
    expect(NBA_COACHES).toHaveLength(30);
    expect(new Set(NBA_COACHES.map((coach) => coach.team)).size).toBe(30);
    const kerr = NBA_COACHES.find((coach) => coach.team === "GSW");
    expect(kerr?.name).toMatch(/kerr/i);
    expect(kerr?.role).toBe("coach");
    expect(kerr?.position).toBe("HC");
    expect(kerr?.headshotUrl).toMatch(/players\/full\/996\.png/);
    expect(isCoachId(kerr?.id)).toBe(true);
    expect(getCoach(kerr?.id)?.name).toBe(kerr?.name);
    expect(getPlayer(kerr!.id)?.role).toBe("coach");
    const finch = NBA_COACHES.find((coach) => coach.team === "MIN");
    expect(finch?.headshotUrl).toBe("/composer-headshots/coach-MIN.jpg");
    expect(NBA_COACHES.every((coach) => !coach.headshotUrl.includes("/coaches/full/"))).toBe(
      true,
    );
    expect(POSITION_FILTERS.some((option) => option.id === "Coach")).toBe(true);
    const coaches = searchPlayers("", { position: "Coach" }, withCoaches([]));
    expect(coaches).toHaveLength(30);
    expect(coaches.every((row) => row.role === "coach")).toBe(true);
    const guards = searchPlayers("", { position: "G" }, withCoaches([]));
    expect(guards.every((row) => row.role !== "coach")).toBe(true);
  });
});
