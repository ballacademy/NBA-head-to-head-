import { describe, expect, it } from "vitest";
import {
  COMPOSER_TITLE_MAX_LENGTH,
  commitComposerText,
  linedComposerTitle,
  measureTitleAdvance,
  splitBalancedTitle,
} from "./titleLayout";

const widthDelta = (lines: string[]) => {
  if (lines.length < 2) {
    return 0;
  }
  return Math.abs(measureTitleAdvance(lines[0]!) - measureTitleAdvance(lines[1]!));
};

const bestDelta = (title: string) => {
  const words = title.trim().toUpperCase().split(/\s+/);
  let best = Number.POSITIVE_INFINITY;
  for (let index = 1; index < words.length; index += 1) {
    const delta = Math.abs(
      measureTitleAdvance(words.slice(0, index).join(" ")) -
        measureTitleAdvance(words.slice(index).join(" ")),
    );
    if (delta < best) {
      best = delta;
    }
  }
  return best;
};

describe("composer title layout", () => {
  it("does not uppercase or move characters when committing a keystroke", () => {
    expect(commitComposerText("Most Disappointing")).toBe("Most Disappointing");
    expect(commitComposerText("line\nbreak", 20)).toBe("line break");
    expect(commitComposerText("x".repeat(120))).toHaveLength(COMPOSER_TITLE_MAX_LENGTH);
  });

  it("keeps a single word on one line and splits two words", () => {
    expect(splitBalancedTitle("WESTERN")).toEqual(["WESTERN"]);
    expect(splitBalancedTitle("BEST PLAYER")).toEqual(["BEST", "PLAYER"]);
  });

  it("picks the word break with the most equal horizontal widths", () => {
    const long = "MOST DISAPPOINTING PLAYER ON EVERY NBA TEAM";
    const lines = splitBalancedTitle(long);
    expect(lines).toHaveLength(2);
    expect(`${lines[0]} ${lines[1]}`).toBe(long);
    expect(widthDelta(lines)).toBeCloseTo(bestDelta(long), 8);

    const standings = splitBalancedTitle("PROJECTED NBA STANDINGS");
    expect(standings).toHaveLength(2);
    expect(`${standings[0]} ${standings[1]}`).toBe("PROJECTED NBA STANDINGS");
    expect(widthDelta(standings)).toBeCloseTo(bestDelta("PROJECTED NBA STANDINGS"), 8);

    const tier = splitBalancedTitle("GUESS THE NBA TIER LIST");
    expect(tier).toHaveLength(2);
    expect(widthDelta(tier)).toBeCloseTo(bestDelta("GUESS THE NBA TIER LIST"), 8);
  });

  it("mirrors the overlay wrap with a newline so the textarea caret can land mid-line", () => {
    const long = "MOST DISAPPOINTING PLAYER ON EVERY NBA TEAM";
    const lines = splitBalancedTitle(long);
    const lined = linedComposerTitle(long, lines);
    expect(lined).toBe(`${lines[0]}\n${lines[1]}`);
    expect(commitComposerText(lined)).toBe(long);
    expect(
      linedComposerTitle("Most Disappointing Player On Every NBA Team", lines),
    ).toBe("Most Disappointing\nPlayer On Every NBA Team");
    expect(linedComposerTitle("WESTERN", ["WESTERN"])).toBe("WESTERN");
  });
});
