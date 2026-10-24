import { describe, expect, it } from "vitest";
import { HOOP_FROM_BASELINE_FT, shotToPx } from "./shotChartLayout";
import {
  courtPoint,
  parseShotChartPlays,
  shotLine,
  shotZone,
  shotZoneSplits,
  visibleShots,
} from "./shotChartState";

const pbpShot = (
  id: string,
  x: number,
  y: number,
  extra: Record<string, unknown> = {},
) => ({
  shootingPlay: true,
  scoringPlay: extra.scoringPlay ?? false,
  coordinate: { x, y },
  pointsAttempted: extra.pointsAttempted ?? 2,
  type: { text: extra.type ?? "Jump Shot" },
  participants: [{ athlete: { id } }],
  text: extra.text ?? "",
});

describe("shot chart", () => {
  it("plots one player's makes and misses from ESPN play-by-play coordinates", () => {
    const shots = parseShotChartPlays(
      {
        plays: [
          pbpShot("3975", 25, 5, {
            scoringPlay: true,
            text: "Made jumper",
          }),
          pbpShot("3975", 10, 20, {
            type: "Jump Shot",
            pointsAttempted: 3,
            text: "Missed 3",
          }),
          pbpShot("1966", 25, 5, {
            scoringPlay: true,
            text: "Someone else",
          }),
          {
            shootingPlay: true,
            scoringPlay: true,
            coordinate: { x: 25, y: 15 },
            type: { text: "Free Throw - 1 of 2" },
            pointsAttempted: 1,
            participants: [{ athlete: { id: "3975" } }],
            text: "Makes free throw",
          },
          {
            shootingPlay: false,
            coordinate: { x: -214748340, y: -214748365 },
            type: { text: "Jumpball" },
            participants: [{ athlete: { id: "3975" } }],
            text: "Jump ball",
          },
        ],
      },
      "3975",
    );
    expect(shots).toHaveLength(2);
    expect(shots[0]?.made).toBe(true);
    expect(shots[1]?.made).toBe(false);
    expect(shotLine(1, 2)).toBe("1-2");
    const hoop = courtPoint({ x: 25, y: 0, made: true, text: "" }, 500, 470);
    expect(hoop.x).toBeCloseTo(250);
    expect(hoop.y).toBeCloseTo(470 - (HOOP_FROM_BASELINE_FT / 47) * 470);
    const laid = shotToPx(
      { x: 25, y: 1 },
      { x: 0, y: 0, w: 500, h: 470 },
    );
    expect(laid.y).toBeGreaterThan(380);
    expect(shotZone({ x: 25, y: 2, made: true, text: "" })).toBe("ra");
    expect(shotZone({ x: 3, y: 8, made: false, text: "" })).toBe("left-c3");
    expect(visibleShots(shots, true, false).every((shot) => shot.made)).toBe(true);
    const splits = shotZoneSplits(shots);
    expect(splits.some((zone) => zone.attempts > 0)).toBe(true);
    expect(splits.every((zone) => /^\d+–\d+$/.test(`${zone.makes}–${zone.attempts}`))).toBe(
      true,
    );
  });

  it("does not invent dots when ESPN has no shooting coordinates", () => {
    expect(
      parseShotChartPlays({ plays: [{ shootingPlay: false, text: "Turnover" }] }, "3975"),
    ).toEqual([]);
    expect(parseShotChartPlays({ boxscore: {} }, "3975")).toEqual([]);
  });
});
