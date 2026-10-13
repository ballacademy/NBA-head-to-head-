import { describe, expect, it } from "vitest";
import { EXPORT_HEIGHT, EXPORT_WIDTH } from "../standingsComposer/rankingState";
import { FIELD_TEXTURE_SRC } from "../standingsComposer/headerTexture";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import {
  GRAPHIC_ASPECT,
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  RL_FOOTER_H,
  RL_HEADER_H,
  RL_PAD_X,
  RL_STRIP_GAP,
  RL_STRIP_H,
  RL_STRIP_W,
  rlStripX,
} from "./rankedLineupsLayout";
import { TOTW_STRIP_GAP } from "../teamOfTheWeekComposer/teamOfTheWeekLayout";
import {
  applyPlayerPick,
  createEmptyStrips,
  DEFAULT_RANK_PILL,
  DEFAULT_RANKED_LINEUP_TITLE,
  defaultRankedLineupsDraft,
  LINEUP_POSITIONS,
  lineupPosition,
  nextRankPill,
  RANK_PILL_PRESETS,
  RANKED_LINEUP_STRIP_COUNT,
  slidesFromDraft,
  splitRankedLineupTitle,
  usedLineupPlayerIds,
} from "./rankedLineupsState";

describe("ranked lineups", () => {
  it("keeps the Instagram 4:5 PNG size", () => {
    expect(GRAPHIC_WIDTH).toBe(1200);
    expect(GRAPHIC_HEIGHT).toBe(1500);
    expect(GRAPHIC_ASPECT).toBeCloseTo(0.8);
    expect(EXPORT_WIDTH).toBe(2400);
    expect(EXPORT_HEIGHT).toBe(3000);
    expect(RL_HEADER_H + RL_STRIP_H + RL_FOOTER_H).toBe(GRAPHIC_HEIGHT);
    expect(RL_STRIP_W).toBeGreaterThan(200);
    expect(RL_STRIP_H).toBeGreaterThan(RL_STRIP_W * 4);
    expect(rlStripX(0)).toBeLessThan(rlStripX(1));
    expect(FIELD_TEXTURE_SRC).toBe("/composer-background-texture.png");
  });

  it("is five PG–C strips with a BEST rank pill, not an unranked lineup", () => {
    expect(RANKED_LINEUP_STRIP_COUNT).toBe(5);
    expect([...LINEUP_POSITIONS]).toEqual(["PG", "SG", "SF", "PF", "C"]);
    expect(lineupPosition(0)).toBe("PG");
    expect(lineupPosition(4)).toBe("C");
    expect(createEmptyStrips()).toHaveLength(5);
    const draft = defaultRankedLineupsDraft();
    expect(draft.title).toBe(DEFAULT_RANKED_LINEUP_TITLE);
    expect(draft.rank).toBe(DEFAULT_RANK_PILL);
    expect(draft.brand.toUpperCase()).toBe("BALLACADEMY");
    expect(RANK_PILL_PRESETS[0]).toBe("BEST");
    expect(RANK_PILL_PRESETS[1]).toBe("2ND");
    expect(RANK_PILL_PRESETS).toHaveLength(10);
    expect(splitRankedLineupTitle(DEFAULT_RANKED_LINEUP_TITLE)).toEqual([
      "TOP 10 NBA PLAYERS",
      "AT EACH POSITION",
    ]);
    expect(RL_PAD_X).toBe(12);
    expect(RL_STRIP_GAP).toBe(4);
    expect(TOTW_STRIP_GAP).toBeGreaterThan(RL_STRIP_GAP);
    expect(nextRankPill("BEST")).toBe("2ND");
    expect(nextRankPill("2ND")).toBe("3RD");
    expect(nextRankPill("10TH")).toBe("11TH");
    expect(slidesFromDraft(draft)).toHaveLength(1);
    expect(draft.showFade).toBe(false);
  });

  it("fills a position from the picker and tags used players by slot", () => {
    const luka = getPlayer("3945274")!;
    const filled = applyPlayerPick(createEmptyStrips(), 0, luka);
    expect(filled[0]?.playerId).toBe("3945274");
    expect(usedLineupPlayerIds(filled)["3945274"]).toBe("PG");
  });
});
