import { describe, expect, it } from "vitest";
import {
  courtPoint,
  parseShotChartPlays,
  shotLine,
  shotZone,
  shotZoneSplits,
  visibleShots,
} from "./shotChartState";

describe("shot chart", () => {
  it("plots one player's makes and misses from ESPN shotchart plays", () => {
    const shots = parseShotChartPlays(
      {
        shotchart: {
          plays: [
            {
              shootingPlay: true,
              scoringPlay: true,
              coordinate: { x: 25, y: 5 },
              athlete: { id: "3975" },
              text: "Made jumper",
            },
            {
              shootingPlay: true,
              scoringPlay: false,
              coordinate: { x: 10, y: 20 },
              participants: [{ athlete: { id: "3975" } }],
              text: "Missed 3",
            },
            {
              shootingPlay: true,
              scoringPlay: true,
              coordinate: { x: 25, y: 5 },
              athlete: { id: "1966" },
              text: "Someone else",
            },
          ],
        },
      },
      "3975",
    );
    expect(shots).toHaveLength(2);
    expect(shots[0]?.made).toBe(true);
    expect(shots[1]?.made).toBe(false);
    expect(shotLine(1, 2)).toBe("1-2");
    const hoop = courtPoint({ x: 25, y: 0, made: true, text: "" }, 500, 470);
    expect(hoop.x).toBeCloseTo(250);
    expect(hoop.y).toBeCloseTo(470);
    expect(shotZone({ x: 25, y: 2, made: true, text: "" })).toBe("ra");
    expect(shotZone({ x: 3, y: 8, made: false, text: "" })).toBe("left-c3");
    expect(visibleShots(shots, true, false).every((shot) => shot.made)).toBe(true);
    expect(shotZoneSplits(shots).some((zone) => zone.attempts > 0)).toBe(true);
  });
});
