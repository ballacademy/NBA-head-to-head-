import { describe, expect, it } from "vitest";
import {
  composerNightHeading,
  nightStandoutPickerRows,
  parseComposerNightDate,
} from "./composerNight";
import type { NightStandout } from "../playerOfTheDayComposer/nightStandouts";
import { emptyStats } from "../playerOfTheDayComposer/lastGame";

describe("shared composer night", () => {
  it("keeps Tonight / Last night and same-day custom dates, snaps stale slates", () => {
    const now = new Date("2026-10-15T18:00:00-04:00");
    expect(parseComposerNightDate("2026-10-15", now)).toBe("2026-10-15");
    expect(parseComposerNightDate("2026-10-14", now)).toBe("2026-10-14");
    expect(parseComposerNightDate("2026-10-12", now)).toBe("2026-10-15");
    expect(
      parseComposerNightDate({ date: "2026-10-12", asOf: "2026-10-15" }, now),
    ).toBe("2026-10-12");
    expect(
      parseComposerNightDate({ date: "2026-10-14", asOf: "2026-10-14" }, now),
    ).toBe("2026-10-14");
    expect(
      parseComposerNightDate({ date: "2026-10-10", asOf: "2026-10-10" }, now),
    ).toBe("2026-10-15");
  });

  it("labels today, last night, and a specific date the same way on every tab", () => {
    expect(composerNightHeading("2026-10-15", "2026-10-15", "2026-10-14")).toBe(
      "Tonight’s standouts",
    );
    expect(composerNightHeading("2026-10-14", "2026-10-15", "2026-10-14")).toBe(
      "Last night’s standouts",
    );
    expect(composerNightHeading("2026-10-12", "2026-10-15", "2026-10-14")).toBe(
      "Standouts · 2026-10-12",
    );
  });

  it("maps standouts into picker rows", () => {
    const row: NightStandout = {
      athleteId: "1",
      name: "Victor Wembanyama",
      teamId: "SAS",
      badge: "19 PTS",
      flags: [],
      line: "19/4/2",
      score: 19,
      game: {
        eventId: "1",
        gameDate: "2026-10-14",
        teamId: "SAS",
        opponentId: "MIA",
        opponentAbbrev: "MIA",
        result: "W",
        playerScore: "120",
        opponentScore: "110",
        resultLine: "W 120-110 MIA",
        dateLabel: "10/14",
        stats: emptyStats(),
      },
    };
    expect(nightStandoutPickerRows([row])).toEqual([
      { id: "1", badge: "19 PTS", meta: "19/4/2" },
    ]);
  });
});
