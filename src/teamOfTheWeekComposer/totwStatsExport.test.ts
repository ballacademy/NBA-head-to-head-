import { describe, expect, it } from "vitest";
import { emptyStats } from "../playerOfTheDayComposer/lastGame";
import type { NightStandout } from "../playerOfTheDayComposer/nightStandouts";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import { createEmptyStrip, splitPlayerName, type TotwStrip } from "./teamOfTheWeekState";
import {
  TOTW_STATS_EMPTY,
  TOTW_STATS_FIELDS,
  TOTW_STATS_NOTE,
  TOTW_STATS_PLUS_TITLE,
  buildPlusStatsSheet,
  buildTotwStatsSheet,
  totwStatsCaption,
  totwStatsCsv,
  totwStatsFromStandout,
  totwStatsHasRows,
  totwStatsSheetName,
} from "./totwStatsExport";

const stripFor = (athleteId: string): TotwStrip => {
  const player = getPlayer(athleteId)!;
  const names = splitPlayerName(player.name);
  return {
    ...createEmptyStrip(),
    playerId: athleteId,
    teamId: player.team,
    firstName: names.firstName,
    lastName: names.lastName,
  };
};

const weekRow = (
  athleteId: string,
  stats: Partial<NightStandout["game"]["stats"]>,
  games = 3,
): NightStandout => {
  const player = getPlayer(athleteId)!;
  return {
    athleteId,
    name: player.name,
    teamId: player.team,
    badge: "Standout",
    flags: [],
    line: `${stats.pts ?? "16"} PTS`,
    score: 40,
    games,
    game: {
      eventId: "1",
      gameDate: "2026-10-14",
      teamId: player.team,
      opponentId: "SAS",
      opponentAbbrev: "SAS",
      result: "W",
      playerScore: "110",
      opponentScore: "100",
      resultLine: "W",
      dateLabel: "10/14",
      stats: {
        ...emptyStats(),
        pts: "16.5",
        reb: "3.8",
        ast: "2.8",
        stl: "1",
        blk: "0.3",
        fg: "6-12",
        three: "2-5",
        tov: "1",
        min: "22",
        ft: "2-2",
        ...stats,
      },
    },
  };
};

describe("TOTW week stats export", () => {
  it("exports GP, counting, and shooting for the filled PG–C names", () => {
    expect(TOTW_STATS_FIELDS.map((field) => field.label)).toEqual([
      "GP",
      "PTS",
      "REB",
      "AST",
      "STL",
      "BLK",
      "3PM",
      "FG%",
      "3P%",
      "TS%",
      "eFG%",
    ]);
    const porter = "4278104";
    const brown = "3917376";
    const flagg = "5041939";
    const barnes = "4433134";
    const wemby = "5104157";
    const barnhizer = "4684208";
    const strips = [porter, brown, flagg, barnes, wemby].map(stripFor);
    strips[2] = createEmptyStrip();
    const rows = [
      weekRow(porter, { pts: "21.7", reb: "3.3", ast: "1", fg: "8-14", three: "3-7", ft: "3-3" }),
      weekRow(brown, { pts: "20", reb: "4", ast: "2.3", fg: "7-15", three: "2-6", ft: "4-5" }),
      weekRow(barnes, { pts: "16.3", reb: "5.3", ast: "3.3", stl: "1.3", blk: "1.3", fg: "6-12", three: "1-4", ft: "3-4" }, 4),
      weekRow(wemby, { pts: "13.8", reb: "6.3", ast: "3", stl: "1.3", blk: "2.3", fg: "5-11", three: "1-4", ft: "3-4" }, 4),
      weekRow(barnhizer, { pts: "10.8", reb: "4", ast: "2" }),
    ];
    const sheet = buildTotwStatsSheet({
      brand: "BALLACADEMY",
      title: "TEAM OF THE WEEK",
      week: "WEEK OF OCT 3–18, 2026",
      strips,
      weekRows: rows,
    });
    expect(sheet.sections).toHaveLength(1);
    expect(sheet.sections[0]!.rows.map((row) => row.athleteId)).toEqual([
      porter,
      brown,
      barnes,
      wemby,
    ]);
    expect(sheet.sections[0]!.rows.map((row) => row.slot)).toEqual([
      "PG",
      "SG",
      "PF",
      "C",
    ]);
    expect(sheet.sections[0]!.rows.map((row) => row.athleteId)).not.toContain(
      barnhizer,
    );
    const first = sheet.sections[0]!.rows[0]!;
    expect(first.gp).toBe("3");
    expect(first.pts).toBe("21.7");
    expect(first.tpm).toBe("3");
    expect(first.fgPct).toBe("57.1%");
    expect(first.tpPct).toBe("42.9%");
    expect(first.tsPct).not.toBe(TOTW_STATS_EMPTY);
    expect(first.efgPct).not.toBe(TOTW_STATS_EMPTY);
    const shooting = totwStatsFromStandout(rows[0]!);
    expect(shooting.efgPct).toBe(first.efgPct);
    const csv = totwStatsCsv(sheet);
    expect(csv).toContain("Section,Slot,Player,Team,GP,PTS,REB,AST,STL,BLK,3PM,FG%,3P%,TS%,eFG%");
    expect(csv).toContain("TEAM OF THE WEEK,PG,");
    expect(csv).toMatch(/Porter/);
    expect(csv).not.toMatch(/Barnhizer/);
    const caption = totwStatsCaption(sheet);
    expect(caption).toContain(TOTW_STATS_NOTE);
    expect(caption).toContain("21.7/3.3/1");
    expect(caption).toContain("eFG");
  });

  it("exports TOTW and Standouts as separate Plus sections from the graphic slots", () => {
    const totw = ["4278104", "3917376", "5041939", "4433134", "5104157"];
    const standouts = ["3078576", "5175737", "5044385", "4702382", "4277951"];
    const camp = "4684208";
    const slots = [...totw, ...standouts].map(stripFor);
    const weekRows = [...totw, ...standouts, camp].map((id) =>
      weekRow(id, { pts: id === camp ? "10.8" : "16.4" }),
    );
    const sheet = buildPlusStatsSheet({
      brand: "BALLACADEMY",
      week: "WEEK OF OCT 3–18, 2026",
      starterCaption: "TEAM OF THE WEEK",
      standoutCaption: "STANDOUTS OF THE WEEK",
      slots,
      weekRows,
    });
    expect(sheet.title).toBe(TOTW_STATS_PLUS_TITLE);
    expect(sheet.sections.map((section) => section.id)).toEqual([
      "starters",
      "standouts",
    ]);
    expect(sheet.sections[0]!.rows.map((row) => row.athleteId)).toEqual(totw);
    expect(sheet.sections[1]!.rows.map((row) => row.athleteId)).toEqual(standouts);
    expect(sheet.sections[1]!.rows.map((row) => row.name).join(" ")).toMatch(
      /Lendeborg/,
    );
    expect(sheet.sections[1]!.rows.map((row) => row.name).join(" ")).toMatch(
      /da Silva|Silva/,
    );
    expect(totwStatsCsv(sheet)).not.toMatch(/Barnhizer/);
    expect(totwStatsCaption(sheet)).toContain("STANDOUTS OF THE WEEK");
    expect(totwStatsCaption(sheet)).toContain("TEAM OF THE WEEK");
    expect(totwStatsHasRows(buildTotwStatsSheet({
      brand: "BA",
      title: "TEAM OF THE WEEK",
      week: "WEEK",
      strips: Array.from({ length: 5 }, createEmptyStrip),
      weekRows: [],
    }))).toBe(false);
  });

  it("keeps Jr. and da Silva on one First Last line", () => {
    const porter = "4278104";
    const daSilva = "4702382";
    expect(getPlayer(porter)?.name).toBe("Michael Porter Jr.");
    expect(getPlayer(daSilva)?.name).toBe("Tristan da Silva");
    expect(splitPlayerName("Michael Porter Jr.")).toEqual({
      firstName: "Michael Porter",
      lastName: "Jr.",
    });
    expect(splitPlayerName("Tristan da Silva")).toEqual({
      firstName: "Tristan da",
      lastName: "Silva",
    });
    const sheet = buildPlusStatsSheet({
      brand: "BALLACADEMY",
      week: "WEEK",
      starterCaption: "TEAM OF THE WEEK",
      standoutCaption: "STANDOUTS OF THE WEEK",
      slots: [stripFor(porter), ...Array.from({ length: 4 }, createEmptyStrip), stripFor(daSilva)],
      weekRows: [weekRow(porter, {}), weekRow(daSilva, {})],
    });
    const porterRow = sheet.sections[0]!.rows[0]!;
    const silvaRow = sheet.sections[1]!.rows[0]!;
    expect(totwStatsSheetName(porterRow)).toBe("Michael Porter Jr.");
    expect(totwStatsSheetName(silvaRow)).toBe("Tristan da Silva");
    expect(totwStatsSheetName(porterRow)).not.toMatch(/^Jr/i);
    expect(totwStatsSheetName(silvaRow)).not.toMatch(/^Silva/i);
  });
});
