import { describe, expect, it } from "vitest";
import {
  composerNightHeading,
  nightStandoutPickerRows,
} from "./composerNight";
import type { NightStandout } from "../playerOfTheDayComposer/nightStandouts";
import { emptyStats } from "../playerOfTheDayComposer/lastGame";

describe("shared composer night", () => {
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
