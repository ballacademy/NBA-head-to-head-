import { describe, expect, it } from "vitest";
import { HEADLINE_TITLE_PRESETS } from "../instagramComposer/composerPresets";
import {
  applyPosterNewsPlayer,
  defaultPosterNewsDraft,
  pickDidNotWriteHeadline,
  POSTER_KICKER_PRESETS,
} from "./posterNewsState";
import type { TierPlayer } from "../tierListComposer/nbaActivePlayers";

const player = {
  id: "1966",
  name: "Gregg Popovich",
  team: "SAS",
  headshotUrl: "https://example.com/pop.png",
} as TierPlayer;

describe("poster news", () => {
  it("keeps BREAKING / REPORT / STATEMENT / INJURY off Headline’s plate list", () => {
    expect(POSTER_KICKER_PRESETS).toEqual([
      "BREAKING",
      "REPORT",
      "STATEMENT",
      "INJURY",
    ]);
    expect(HEADLINE_TITLE_PRESETS).toContain("BREAKING");
    expect(HEADLINE_TITLE_PRESETS).not.toContain("REPORT");
    expect(HEADLINE_TITLE_PRESETS).not.toContain("STATEMENT");
    expect(HEADLINE_TITLE_PRESETS).not.toContain("INJURY");
  });

  it("never writes the headline when picking a player", () => {
    const before = {
      ...defaultPosterNewsDraft(),
      kicker: "BREAKING",
      line1: "STEPPING AWAY",
      line2: "AFTER 29 SEASONS",
      line3: "",
    };
    const after = applyPosterNewsPlayer(before, player, false);
    expect(pickDidNotWriteHeadline(before, after)).toBe(true);
    expect(after.line1).toBe("STEPPING AWAY");
    expect(after.photoSrc).toBe(player.headshotUrl);
    expect(after.playerId).toBe("1966");
  });
});
