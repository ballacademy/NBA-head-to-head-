import { describe, expect, it } from "vitest";
import {
  COMPOSER_HASHTAGS,
  graphicCaption,
  rankedLineupCaption,
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
});
