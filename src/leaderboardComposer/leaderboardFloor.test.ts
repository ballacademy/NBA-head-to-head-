// @ts-nocheck
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

const boardBlock = (css: string, selector: string) => {
  const match = css.match(new RegExp(`\\${selector} \\{[^}]*\\}`));
  return match?.[0] ?? "";
};

describe("leader format floors", () => {
  it("uses Shot mix on Leader bars: metal title plate, charcoal under the bars", () => {
    const css = read("leaderBarsComposer/leaderBarsComposer.css");
    const canvas = read("leaderBarsComposer/renderLeaderBarsCanvas.ts");
    const paint = read("leaderboardComposer/leaderboardPaint.ts");
    expect(boardBlock(css, ".lb-board")).not.toContain("composer-background-texture");
    expect(boardBlock(css, ".lb-board")).toContain("#1c1c1c");
    expect(css).toContain(".lb-stack::before");
    expect(css).toContain('background-image: url("/composer-background-texture.png")');
    expect(canvas).toContain("paintLeaderTitleMetalFloor");
    expect(canvas).not.toContain("await paintLeaderMetal");
    expect(paint).toContain("paintHeaderMetalField");
    expect(paint).toContain("paintStuddedCharcoal");
  });

  it("uses charcoal hairline list panes on Leader split and Dual ranks", () => {
    const splitCss = read("leaderSplitComposer/leaderSplitComposer.css");
    const dualCss = read("dualRanksComposer/dualRanksComposer.css");
    const splitCanvas = read("leaderSplitComposer/renderLeaderSplitCanvas.ts");
    const dualCanvas = read("dualRanksComposer/renderDualRanksCanvas.ts");
    expect(boardBlock(splitCss, ".ls-board")).not.toContain("composer-background-texture");
    expect(boardBlock(dualCss, ".dr-board")).not.toContain("composer-background-texture");
    expect(splitCss).toContain(".ls-row + .ls-row");
    expect(splitCss).toContain("rgba(255, 255, 255, 0.08)");
    expect(dualCss).toContain(".dr-row + .dr-row:not(.is-feature)");
    expect(splitCanvas).toContain("paintLeaderHairlineRows");
    expect(splitCanvas).not.toContain("paintLeaderMetal");
    expect(dualCanvas).toContain("paintLeaderHairlineRows");
    expect(dualCanvas).not.toContain("paintLeaderMetal");
  });

  it("keeps Poster news type-on-photo with a charcoal empty floor, never slats", () => {
    const css = read("posterNewsComposer/posterNewsComposer.css");
    const canvas = read("posterNewsComposer/renderPosterNewsCanvas.ts");
    expect(css).not.toContain("composer-background-texture");
    expect(boardBlock(css, ".pn-board")).toContain("#1c1c1c");
    expect(css).toContain(".pn-board .pod-photo.is-empty");
    expect(canvas).toContain("paintLeaderCharcoalBoard");
    expect(canvas).not.toContain("paintLeaderMetal");
  });

  it("leaves ranking/photo and data posters on stacked metal", () => {
    const metalBoards = [
      [".ig-board", "standingsComposer/standingsComposer.css"],
      [".tl-board", "tierListComposer/tierListComposer.css"],
      [".pyr-board", "pyramidComposer/pyramidComposer.css"],
      [".rl-board", "rankedLineupsComposer/rankedLineupsComposer.css"],
      [".totw-board", "teamOfTheWeekComposer/teamOfTheWeekComposer.css"],
      [".pod-board", "playerOfTheDayComposer/playerOfTheDayComposer.css"],
      [".cmp-board", "compareComposer/compareComposer.css"],
      [".mt-board", "mockTradeComposer/mockTradeComposer.css"],
      [".pi-board", "playInComposer/playInComposer.css"],
      [".plb-board", "potdLeaderboardComposer/potdLeaderboardComposer.css"],
      [".pk-board", "picksComposer/picksComposer.css"],
      [".inj-board", "injuryComposer/injuryComposer.css"],
      [".sch-board", "scheduleComposer/scheduleComposer.css"],
      [".tws-board", "teamOfTheWeekComposer/totwStatsComposer.css"],
    ] as const;
    for (const [selector, path] of metalBoards) {
      expect(boardBlock(read(path), selector)).toContain("composer-background-texture");
    }
  });
});
