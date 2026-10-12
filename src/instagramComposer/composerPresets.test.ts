import { describe, expect, it } from "vitest";
import {
  exportDateStamp,
  exportFilenameFromTitle,
  slugifyExport,
} from "./composerPresets";
import { STORY_HEIGHT, STORY_WIDTH } from "./exportDownload";

describe("composer export names and story size", () => {
  it("builds a filename from title and date", () => {
    expect(slugifyExport("POTD LEADERBOARD")).toBe("potd-leaderboard");
    expect(
      exportFilenameFromTitle("PLAYER OF THE DAY?", "player-of-the-day", "10/12"),
    ).toBe("player-of-the-day-10-12.png");
    expect(
      exportFilenameFromTitle("POTD LEADERBOARD", "potd-leaderboard", "2026-10-12", true),
    ).toBe("potd-leaderboard-2026-10-12-story.png");
    expect(exportDateStamp(new Date("2026-10-12T15:00:00Z"))).toMatch(
      /^\d{4}-\d{2}-\d{2}$/,
    );
  });

  it("uses a 9:16 story canvas next to 4:5", () => {
    expect(STORY_WIDTH).toBe(1080);
    expect(STORY_HEIGHT).toBe(1920);
    expect(STORY_WIDTH / STORY_HEIGHT).toBeCloseTo(9 / 16);
  });
});
