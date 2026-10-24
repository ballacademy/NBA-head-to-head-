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
  PLOT_MARK_DOT,
  PLOT_MARK_PLAYER,
  PLOT_MARK_TEAM,
  axisFromValues,
  labelsToShow,
  nudgePlotLabels,
  placePlotPoints,
  plotMarkSize,
  plotRectFor,
  sizeScaleFor,
} from "./plotLayout";
import {
  DEFAULT_PLOT_QUADRANTS,
  DEFAULT_PLOT_TITLE,
  autoPlotTitle,
  defaultPlotDraft,
  normalizePlotDraft,
  pinPlotPlayer,
  plotMetricLabel,
  populatePlotPlayers,
  populatePlotTeams,
  splitPlotTitle,
  parsePlotQuadrants,
  togglePlotId,
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
    expect(draft.showNames).toBe(false);
    expect(normalizePlotDraft({}).showNames).toBe(false);
    expect(normalizePlotDraft({ showNames: true }).showNames).toBe(true);
    expect(draft.title).toBe(DEFAULT_PLOT_TITLE);
    expect(splitPlotTitle(DEFAULT_PLOT_TITLE)).toEqual(["PTS VS", "AST"]);
    expect(EVERY_TEAM_STAT_METRICS.map((item) => item.label)).toEqual(
      expect.arrayContaining([
        "TS%",
        "PER",
        "USG%",
        "BPM",
        "VORP",
        "WS",
        "Charges",
        "Deflections",
        "Loose balls",
        "Screen AST",
        "Contested",
        "Box outs",
      ]),
    );
    expect(plotMetricLabel("tsPct")).toBe("TS%");
    expect(plotMetricLabel("per")).toBe("PER");
    expect(plotMetricLabel("chargesDrawn")).toBe("Charges");
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
    expect(okc?.x).toBeGreaterThan(90);
    expect(okc?.y).toBeGreaterThan(18);
    const current = populatePlotTeams(
      "2026-27",
      "points",
      "assists",
      EMPTY_PLAYER_FILTERS,
    );
    const okcNow = current.find((point) => point.id === "OKC");
    expect(okcNow?.x).toBeGreaterThan(100);
    expect(okcNow?.y).toBeGreaterThan(20);
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
    const locked = axisFromValues([12, 28], "points", { min: 0, max: 40 });
    expect(locked.min).toBe(0);
    expect(locked.max).toBe(40);
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
      GRAPHIC_HEIGHT,
      true,
    );
    expect(placed[0]?.showLabel).toBe(true);
    expect(placed[1]?.showLabel).toBe(true);
    expect(placed[1]?.ly).not.toBe(placed[0]?.ly);
    const highlighted = placePlotPoints(
      [
        { id: "a", x: 10, y: 10, label: "Alpha", kind: "player" },
        { id: "b", x: 12, y: 14, label: "Bravo", kind: "player" },
      ],
      { min: 0, max: 20, ticks: [0, 10, 20] },
      { min: 0, max: 20, ticks: [0, 10, 20] },
      GRAPHIC_HEIGHT,
      false,
      ["b"],
    );
    expect(highlighted.find((point) => point.id === "a")?.showLabel).toBe(false);
    expect(highlighted.find((point) => point.id === "b")?.showLabel).toBe(true);
    const allNames = placePlotPoints(
      [
        { id: "a", x: 10, y: 10, label: "Alpha", kind: "player" },
        { id: "b", x: 12, y: 14, label: "Bravo", kind: "player" },
      ],
      { min: 0, max: 20, ticks: [0, 10, 20] },
      { min: 0, max: 20, ticks: [0, 10, 20] },
      GRAPHIC_HEIGHT,
      true,
      ["b"],
    );
    expect(allNames.every((point) => point.showLabel)).toBe(true);
    const unlabeled = placePlotPoints(
      [
        { id: "a", x: 10, y: 10, label: "Alpha", kind: "team" },
        { id: "b", x: 12, y: 14, label: "Bravo", kind: "team" },
      ],
      { min: 0, max: 20, ticks: [0, 10, 20] },
      { min: 0, max: 20, ticks: [0, 10, 20] },
    );
    expect(unlabeled.every((point) => point.showLabel)).toBe(false);
    const nudged = nudgePlotLabels(placed, plotRectFor());
    expect(nudged).toHaveLength(2);
  });

  it("bumps face and circle size and still scales from that base", () => {
    expect(PLOT_MARK_TEAM).toBe(58);
    expect(PLOT_MARK_PLAYER).toBe(46);
    expect(PLOT_MARK_DOT).toBe(14);
    expect(plotMarkSize("team", 30)).toBe(PLOT_MARK_TEAM);
    expect(plotMarkSize("player", 20)).toBe(PLOT_MARK_PLAYER);
    expect(plotMarkSize("player", 80)).toBe(PLOT_MARK_DOT);
    const scale = sizeScaleFor([10, 20, 30]);
    const sized = placePlotPoints(
      [
        { id: "lo", x: 10, y: 10, label: "Lo", kind: "team", size: 10 },
        { id: "hi", x: 20, y: 20, label: "Hi", kind: "team", size: 30 },
      ],
      { min: 0, max: 30, ticks: [0, 15, 30] },
      { min: 0, max: 30, ticks: [0, 15, 30] },
    );
    expect(sized[0]?.mark).toBe(Math.max(8, Math.round(PLOT_MARK_TEAM * scale(10))));
    expect(sized[1]?.mark).toBe(Math.max(8, Math.round(PLOT_MARK_TEAM * scale(30))));
    expect(sized[1]!.mark).toBeGreaterThan(sized[0]!.mark);
    expect(sized[1]!.mark).toBeGreaterThan(PLOT_MARK_TEAM);
    expect(sized[1]!.mark).toBeLessThan(PLOT_MARK_TEAM * 2);
  });

  it("still plots advanced and hustle when the HUD sample is preseason", () => {
    const teams = populatePlotTeams(
      "2026-27",
      "usgPct",
      "per",
      EMPTY_PLAYER_FILTERS,
      "preseason",
    );
    expect(teams).toHaveLength(30);
    expect(teams.every((point) => point.x > 0 && point.y > 10)).toBe(true);
    const hustle = populatePlotTeams(
      "2026-27",
      "chargesDrawn",
      "pace",
      EMPTY_PLAYER_FILTERS,
      "preseason",
    );
    expect(hustle).toHaveLength(30);
    expect(Math.max(...hustle.map((point) => point.x))).toBeGreaterThan(0.1);
    const league = populatePlotPlayers(
      "2026-27",
      "usgPct",
      "chargesDrawn",
      EMPTY_PLAYER_FILTERS,
      [],
      "preseason",
    );
    expect(league.length).toBeGreaterThan(40);
    expect(league.every((point) => point.x > 0 && point.y >= 0)).toBe(true);
  });

  it("plots advanced team and player stats with real axes", () => {
    const teams = populatePlotTeams(
      "2026-27",
      "usgPct",
      "per",
      EMPTY_PLAYER_FILTERS,
    );
    expect(teams.length).toBe(30);
    expect(teams.every((point) => point.x > 0 && point.y > 0)).toBe(true);
    const okc = teams.find((point) => point.id === "OKC");
    expect(okc?.x).toBeGreaterThan(0.15);
    expect(okc?.x).toBeLessThan(0.4);
    expect(okc?.y).toBeGreaterThan(10);
    const ts = populatePlotTeams(
      "2026-27",
      "tsPct",
      "pace",
      EMPTY_PLAYER_FILTERS,
    );
    expect(ts).toHaveLength(30);
    expect(Math.max(...ts.map((point) => point.x))).toBeGreaterThan(0.5);
    expect(Math.max(...ts.map((point) => point.y))).toBeGreaterThan(90);
    const pins = ["3945274", "4278073"];
    const players = populatePlotPlayers(
      "2026-27",
      "usgPct",
      "per",
      EMPTY_PLAYER_FILTERS,
      pins,
    );
    expect(players.map((point) => point.id).sort()).toEqual(pins.sort());
    expect(players.every((point) => point.x > 0.15 && point.y > 10)).toBe(true);
    const league = populatePlotPlayers(
      "2026-27",
      "bpm",
      "vorp",
      EMPTY_PLAYER_FILTERS,
      [],
    );
    expect(league.length).toBeGreaterThan(50);
    expect(league.some((point) => point.y > 2)).toBe(true);
  });

  it("plots hustle stats for teams and players", () => {
    const teams = populatePlotTeams(
      "2026-27",
      "chargesDrawn",
      "pace",
      EMPTY_PLAYER_FILTERS,
    );
    expect(teams.length).toBe(30);
    expect(Math.max(...teams.map((point) => point.x))).toBeGreaterThan(0.1);
    expect(Math.max(...teams.map((point) => point.y))).toBeGreaterThan(90);
    const labels = EVERY_TEAM_STAT_METRICS.map((item) => item.id);
    expect(labels).toEqual(
      expect.arrayContaining([
        "chargesDrawn",
        "deflections",
        "looseBallsRecovered",
        "screenAssists",
        "contestedShots",
        "boxOuts",
      ]),
    );
    const league = populatePlotPlayers(
      "2026-27",
      "chargesDrawn",
      "per",
      EMPTY_PLAYER_FILTERS,
      [],
    );
    expect(league.length).toBeGreaterThan(40);
    expect(Math.max(...league.map((point) => point.x))).toBeGreaterThan(0.05);
    expect(Math.max(...league.map((point) => point.y))).toBeGreaterThan(15);
  });

  it("highlights multiple players or teams and keeps editable quadrant labels", () => {
    expect(togglePlotId([], "den")).toEqual(["den"]);
    expect(togglePlotId(["den", "okc"], "bos")).toEqual(["den", "okc", "bos"]);
    expect(togglePlotId(["den", "okc"], "den")).toEqual(["okc"]);
    expect(parsePlotQuadrants(undefined)).toEqual(DEFAULT_PLOT_QUADRANTS);
    expect(parsePlotQuadrants({ tl: "hot", tr: "ice", bl: "low", br: "right" })).toEqual({
      tl: "hot",
      tr: "ice",
      bl: "low",
      br: "right",
    });
  });

  it("stores player first names and sizes dots by a third stat", () => {
    const pins = ["3945274", "4278073"];
    const players = populatePlotPlayers(
      "2026-27",
      "points",
      "assists",
      EMPTY_PLAYER_FILTERS,
      pins,
      "regular",
      "minutes",
    );
    expect(players.every((point) => point.firstName)).toBe(true);
    expect(players.every((point) => (point.size ?? 0) > 0)).toBe(true);
    const plain = populatePlotPlayers(
      "2026-27",
      "points",
      "assists",
      EMPTY_PLAYER_FILTERS,
      pins,
    );
    expect(plain.every((point) => point.size == null)).toBe(true);
  });
});
