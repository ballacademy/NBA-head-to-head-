import { describe, expect, it } from "vitest";
import catalog from "../../data/every-team-historical-rosters.json";
import { EXPORT_HEIGHT, EXPORT_WIDTH } from "../standingsComposer/rankingState";
import { FIELD_TEXTURE_SRC } from "../standingsComposer/headerTexture";
import {
  EVERY_TEAM_STAT_METRICS,
  hydrateEveryTeamRosters,
} from "../everyTeamComposer/historicalRosters";
import { EMPTY_PLAYER_FILTERS } from "../tierListComposer/nbaActivePlayers";
import {
  GRAPHIC_ASPECT,
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  axisFromValues,
  labelsToShow,
  nudgePlotLabels,
  placePlotPoints,
  plotRectFor,
} from "./plotLayout";
import {
  DEFAULT_PLOT_TITLE,
  autoPlotTitle,
  defaultPlotDraft,
  pinPlotPlayer,
  plotMetricLabel,
  populatePlotPlayers,
  populatePlotTeams,
  splitPlotTitle,
  unpinPlotPlayer,
} from "./plotState";

hydrateEveryTeamRosters(
  catalog as unknown as Parameters<typeof hydrateEveryTeamRosters>[0],
);

describe("plot composer", () => {
  it("keeps the Instagram 4:5 PNG size", () => {
    expect(GRAPHIC_WIDTH).toBe(1200);
    expect(GRAPHIC_HEIGHT).toBe(1500);
    expect(GRAPHIC_ASPECT).toBeCloseTo(0.8);
    expect(EXPORT_WIDTH).toBe(2400);
    expect(EXPORT_HEIGHT).toBe(3000);
    expect(FIELD_TEXTURE_SRC).toBe("/composer-background-texture.png");
    const plot = plotRectFor();
    expect(plot.w).toBeGreaterThan(900);
    expect(plot.h).toBeGreaterThan(1100);
  });

  it("starts empty until populate, with every season-stat on the axes", () => {
    const draft = defaultPlotDraft("2026-27");
    expect(draft.points).toEqual([]);
    expect(draft.subject).toBe("teams");
    expect(draft.title).toBe(DEFAULT_PLOT_TITLE);
    expect(splitPlotTitle(DEFAULT_PLOT_TITLE)).toEqual(["PTS VS", "AST"]);
    expect(EVERY_TEAM_STAT_METRICS.map((item) => item.label)).toContain("TS%");
    expect(plotMetricLabel("tsPct")).toBe("TS%");
    expect(autoPlotTitle("points", "assists", "teams")).toBe("PTS VS AST");
  });

  it("plots all 30 teams on 2012-13 PTS vs AST with padded axes", () => {
    const points = populatePlotTeams(
      "2012-13",
      "points",
      "assists",
      EMPTY_PLAYER_FILTERS,
    );
    expect(points).toHaveLength(30);
    expect(new Set(points.map((point) => point.id)).size).toBe(30);
    expect(points.every((point) => point.kind === "team")).toBe(true);
    const okc = points.find((point) => point.id === "OKC");
    expect(okc?.x).toBeGreaterThan(15);
    expect(okc?.y).toBeGreaterThan(3);
    const current = populatePlotTeams(
      "2026-27",
      "points",
      "assists",
      EMPTY_PLAYER_FILTERS,
    );
    const okcNow = current.find((point) => point.id === "OKC");
    expect(okcNow?.x).toBeGreaterThan(20);
    const xAxis = axisFromValues(
      points.map((point) => point.x),
      "points",
    );
    expect(xAxis.min).toBeLessThan(Math.min(...points.map((point) => point.x)));
    expect(xAxis.max).toBeGreaterThan(Math.max(...points.map((point) => point.x)));
    expect(xAxis.ticks.length).toBeGreaterThan(2);
    expect(xAxis.min).toBeGreaterThanOrEqual(0);
    const tight = axisFromValues([1.2, 3.4, 6], "assists");
    expect(tight.min).toBe(0);
  });

  it("filters West teams and pins unique players without repeats", () => {
    const west = populatePlotTeams("2026-27", "points", "rebounds", {
      ...EMPTY_PLAYER_FILTERS,
      conference: "West",
    });
    expect(west.length).toBe(15);
    expect(west.some((point) => point.id === "OKC")).toBe(true);
    expect(west.some((point) => point.id === "BOS")).toBe(false);
    const pins = pinPlotPlayer(pinPlotPlayer([], "3945274"), "4278073");
    expect(pins).toEqual(["3945274", "4278073"]);
    expect(unpinPlotPlayer(pins, "3945274")).toEqual(["4278073"]);
    const players = populatePlotPlayers(
      "2026-27",
      "points",
      "assists",
      EMPTY_PLAYER_FILTERS,
      pins,
      "regular",
    );
    expect(players.map((point) => point.id).sort()).toEqual(
      ["3945274", "4278073"].sort(),
    );
    expect(new Set(players.map((point) => point.id)).size).toBe(players.length);
    const league = populatePlotPlayers(
      "2026-27",
      "points",
      "assists",
      EMPTY_PLAYER_FILTERS,
      [],
    );
    expect(league.length).toBeGreaterThan(50);
    expect(new Set(league.map((point) => point.id)).size).toBe(league.length);
  });

  it("nudges overlapping labels and only names extremes on a crowded board", () => {
    const crowded = Array.from({ length: 80 }, (_, index) => ({
      id: `p${index}`,
      x: index,
      y: index % 7,
    }));
    const shown = labelsToShow(crowded);
    expect(shown.size).toBeLessThan(crowded.length);
    expect(shown.size).toBeGreaterThan(8);
    const placed = placePlotPoints(
      [
        { id: "a", x: 10, y: 10, label: "Alpha", kind: "team" },
        { id: "b", x: 10.1, y: 10.1, label: "Bravo", kind: "team" },
      ],
      { min: 0, max: 20, ticks: [0, 10, 20] },
      { min: 0, max: 20, ticks: [0, 10, 20] },
    );
    expect(placed[0]?.showLabel).toBe(true);
    expect(placed[1]?.ly).not.toBe(placed[0]?.ly);
    const nudged = nudgePlotLabels(placed, plotRectFor());
    expect(nudged).toHaveLength(2);
  });
});
