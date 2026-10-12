import { describe, expect, it } from "vitest";
import {
  composerHref,
  readComposerMode,
} from "./composerMode";

describe("composer mode", () => {
  it("keeps `/` on standings", () => {
    expect(readComposerMode("", "/")).toBe("standings");
    expect(readComposerMode("?hub=rankings", "/")).toBe("standings");
    expect(composerHref("standings")).toBe("/");
  });

  it("opens the tier list from path or query", () => {
    expect(readComposerMode("", "/tier-list")).toBe("tier");
    expect(readComposerMode("", "/tiers")).toBe("tier");
    expect(readComposerMode("?composer=tier", "/")).toBe("tier");
    expect(composerHref("tier")).toBe("/tier-list");
  });

  it("opens the every-team grid from path or query", () => {
    expect(readComposerMode("", "/every-team")).toBe("every-team");
    expect(readComposerMode("", "/by-team")).toBe("every-team");
    expect(readComposerMode("?composer=every-team", "/")).toBe("every-team");
    expect(readComposerMode("?composer=by-team", "/")).toBe("every-team");
    expect(composerHref("every-team")).toBe("/every-team");
  });

  it("opens player of the day from path or query", () => {
    expect(readComposerMode("", "/player-of-the-day")).toBe("player-of-the-day");
    expect(readComposerMode("", "/potd")).toBe("player-of-the-day");
    expect(readComposerMode("?composer=player-of-the-day", "/")).toBe(
      "player-of-the-day",
    );
    expect(composerHref("player-of-the-day")).toBe("/player-of-the-day");
  });

  it("opens the POTD leaderboard next to player of the day", () => {
    expect(readComposerMode("", "/potd-leaderboard")).toBe("potd-leaderboard");
    expect(readComposerMode("", "/leaderboard")).toBe("potd-leaderboard");
    expect(readComposerMode("?composer=potd-leaderboard", "/")).toBe(
      "potd-leaderboard",
    );
    expect(readComposerMode("", "/potd")).toBe("player-of-the-day");
    expect(composerHref("potd-leaderboard")).toBe("/potd-leaderboard");
  });

  it("opens team of the week from path or query", () => {
    expect(readComposerMode("", "/team-of-the-week")).toBe("team-of-the-week");
    expect(readComposerMode("", "/totw")).toBe("team-of-the-week");
    expect(readComposerMode("?composer=team-of-the-week", "/")).toBe(
      "team-of-the-week",
    );
    expect(readComposerMode("?composer=totw", "/")).toBe("team-of-the-week");
    expect(composerHref("team-of-the-week")).toBe("/team-of-the-week");
  });

  it("lets the path win when query and path disagree", () => {
    expect(readComposerMode("?composer=tier", "/every-team")).toBe("every-team");
    expect(readComposerMode("?composer=every-team", "/tier-list")).toBe("tier");
    expect(readComposerMode("?composer=tier", "/player-of-the-day")).toBe(
      "player-of-the-day",
    );
    expect(readComposerMode("?composer=potd", "/team-of-the-week")).toBe(
      "team-of-the-week",
    );
  });
});
