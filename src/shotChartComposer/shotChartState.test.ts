import { describe, expect, it } from "vitest";
import {
  COURT_FLOOR,
  COURT_VIEW_H_FT,
  HOOP_FROM_BASELINE_FT,
  SHOT_COURT_GAP,
  SHOT_HEADER_H,
  SHOT_MAKE_R,
  SHOT_MISS_R,
  shotToPx,
} from "./shotChartLayout";
import {
  applyShotChartFilter,
  courtPoint,
  defaultShotChartDraft,
  formatShotMatchup,
  formatZoneLockup,
  gamesForShotWindow,
  parseShotChartPlays,
  shotChartFilter,
  shotChartNotchMeta,
  shotGameOptionLabel,
  shotLine,
  shotZone,
  shotZoneSplits,
  splitShotChartTitle,
  visibleShots,
} from "./shotChartState";
import type { LastGame } from "../playerOfTheDayComposer/lastGame";

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

const game = (partial: Partial<LastGame> & Pick<LastGame, "eventId" | "gameDate">): LastGame => ({
  teamId: "GSW",
  opponentId: "OKC",
  opponentAbbrev: "OKC",
  result: "W",
  playerScore: "120",
  opponentScore: "110",
  home: true,
  resultLine: "W 120-110",
  dateLabel: "10/24",
  stats: {
    pts: "30",
    reb: "5",
    ast: "6",
    stl: "1",
    blk: "0",
    fg: "9-20",
    three: "3-8",
    tov: "2",
    min: "34",
  },
  ...partial,
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
    expect(hoop.y).toBeCloseTo(470 - (HOOP_FROM_BASELINE_FT / COURT_VIEW_H_FT) * 470);
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
    expect(formatZoneLockup("PAINT", 3, 3)).toBe("PAINT 3–3");
    expect(formatZoneLockup("", 0, 0)).toBe("0–0");
  });

  it("keeps stacked metal in the header only and a flat court floor", () => {
    expect(SHOT_HEADER_H).toBe(165);
    expect(SHOT_COURT_GAP).toBe(16);
    expect(COURT_VIEW_H_FT).toBe(40);
    expect(COURT_VIEW_H_FT).toBeLessThan(47);
    expect(COURT_FLOOR.toLowerCase()).toBe("#121212");
    expect(SHOT_MAKE_R).toBeGreaterThan(9);
    expect(SHOT_MISS_R).toBeGreaterThan(8);
  });

  it("does not invent dots when ESPN has no shooting coordinates", () => {
    expect(
      parseShotChartPlays({ plays: [{ shootingPlay: false, text: "Turnover" }] }, "3975"),
    ).toEqual([]);
    expect(parseShotChartPlays({ boxscore: {} }, "3975")).toEqual([]);
  });

  it("keeps SHOT CHART on one line and the name notch as the supporting lockup", () => {
    expect(splitShotChartTitle("SHOT CHART")).toEqual(["SHOT CHART"]);
    expect(splitShotChartTitle("")).toEqual(["SHOT CHART"]);
    const draft = defaultShotChartDraft();
    expect(draft.showOpponent).toBe(false);
    expect(draft.showZones).toBe(true);
    expect(draft.showLegend).toBe(true);
    expect(shotChartFilter(draft)).toBe("both");
    expect(shotChartFilter(applyShotChartFilter(draft, "makes"))).toBe("makes");
    expect(shotChartFilter(applyShotChartFilter(draft, "misses"))).toBe("misses");
    expect(
      shotChartNotchMeta({
        ...draft,
        window: "last-game",
        gameLabel: "10/24",
        matchup: "vs OKC",
        makes: 9,
        attempts: 20,
      }),
    ).toBe("10/24 · 9-20");
    expect(
      shotChartNotchMeta({
        ...draft,
        window: "last-game",
        eventId: "401",
        gameLabel: "10/24",
        matchup: "vs OKC",
        showOpponent: true,
        makes: 9,
        attempts: 20,
      }),
    ).toBe("10/24 · vs OKC · 9-20");
  });

  it("picks a night or a specific game without inventing an opponent on a range", () => {
    const home = game({ eventId: "1", gameDate: "2026-10-24", home: true });
    const away = game({
      eventId: "2",
      gameDate: "2026-10-22",
      home: false,
      opponentAbbrev: "IND",
      dateLabel: "10/22",
    });
    expect(formatShotMatchup(home)).toBe("vs OKC");
    expect(formatShotMatchup(away)).toBe("@ IND");
    expect(shotGameOptionLabel(home)).toBe("10/24 vs OKC");
    expect(
      gamesForShotWindow([home, away], "last-game", { from: "", to: "" }, { eventId: "2" }).map(
        (row) => row.eventId,
      ),
    ).toEqual(["2"]);
    expect(
      gamesForShotWindow(
        [home, away],
        "last-game",
        { from: "", to: "" },
        { nightDate: "2026-10-24" },
      ).map((row) => row.eventId),
    ).toEqual(["1"]);
    expect(
      gamesForShotWindow(
        [home, away],
        "range",
        { from: "2026-10-22", to: "2026-10-24" },
        { eventId: "2" },
      ).map((row) => row.eventId),
    ).toEqual(["1", "2"]);
  });
});
