import { describe, expect, it } from "vitest";
import {
  COMPOSER_FIRST_COMMENT_PROMPT,
  COMPOSER_HASHTAGS,
  everyTeamCaption,
  graphicCaption,
  rankedLineupCaption,
  statCardLineCaption,
  tierListCaption,
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
        COMPOSER_FIRST_COMMENT_PROMPT,
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

  it("builds a Stat card caption from name, PTS/REB/AST, and W/L", () => {
    expect(
      statCardLineCaption({
        firstName: "Giannis",
        lastName: "Antetokounmpo",
        gameDate: "2026-10-14",
        matchup: "W vs NYK 120–110",
        stats: [
          { key: "pts", value: "20" },
          { key: "reb", value: "15" },
          { key: "ast", value: "9" },
          { key: "min", value: "24" },
        ],
      }),
    ).toBe(
      [
        "Giannis Antetokounmpo",
        "20/15/9 in 24 min",
        "W vs NYK 120–110",
        COMPOSER_HASHTAGS,
        COMPOSER_FIRST_COMMENT_PROMPT,
      ].join("\n"),
    );
  });

  it("builds Every Team and Tier captions with a first-comment prompt", () => {
    expect(everyTeamCaption("Every NBA team", ["Luka Doncic", "Shai"])).toBe(
      [
        "Every NBA team",
        "Luka Doncic",
        "Shai",
        COMPOSER_HASHTAGS,
        COMPOSER_FIRST_COMMENT_PROMPT,
      ].join("\n"),
    );
    expect(
      tierListCaption("Guess the tier", [
        { label: "S", names: ["Jokic", "Shai"] },
        { label: "A", names: ["Tatum"] },
        { label: "B", names: [] },
      ]),
    ).toBe(
      [
        "Guess the tier",
        "S: Jokic, Shai",
        "A: Tatum",
        COMPOSER_HASHTAGS,
        COMPOSER_FIRST_COMMENT_PROMPT,
      ].join("\n"),
    );
  });
});
