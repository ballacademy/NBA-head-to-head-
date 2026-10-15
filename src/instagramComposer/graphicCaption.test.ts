import { describe, expect, it } from "vitest";
import {
  COMPOSER_HASHTAGS,
  graphicCaption,
  rankedLineupCaption,
  statCardLineCaption,
} from "./graphicCaption";

describe("graphic captions", () => {
  it("builds a ranked-lineups caption with title, rank, names, and hashtags", () => {
    const caption = rankedLineupCaption("Top 10 NBA Players at Each Position", "BEST", [
      { firstName: "Shai", lastName: "Gilgeous-Alexander" },
      { firstName: "Anthony", lastName: "Edwards" },
      { firstName: "", lastName: "" },
    ]);
    expect(caption).toBe(
      [
        "Top 10 NBA Players at Each Position",
        "BEST",
        "Shai Gilgeous-Alexander",
        "Anthony Edwards",
        COMPOSER_HASHTAGS,
      ].join("\n"),
    );
  });

  it("skips blank extra lines", () => {
    expect(graphicCaption("TEAM OF THE WEEK", ["Luka Doncic"], ["", "  "])).toContain(
      COMPOSER_HASHTAGS,
    );
    expect(graphicCaption("TEAM OF THE WEEK", ["Luka Doncic"], ["", "  "])).not.toMatch(
      /\n\n/,
    );
  });

  it("builds a Stat card caption from PTS/REB/AST and minutes", () => {
    expect(
      statCardLineCaption({
        firstName: "Giannis",
        lastName: "Antetokounmpo",
        gameDate: "2026-10-14",
        stats: [
          { key: "pts", value: "20" },
          { key: "reb", value: "15" },
          { key: "ast", value: "9" },
          { key: "min", value: "24" },
        ],
      }),
    ).toBe(
      ["Giannis 20/15/9 in 24 min", "2026-10-14", COMPOSER_HASHTAGS].join("\n"),
    );
  });
});
