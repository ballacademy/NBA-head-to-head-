import { describe, expect, it } from "vitest";
import { STORY_HEIGHT, storyBoardRect } from "./exportDownload";
import { squareFilename, storyFilename } from "./exportPack";

describe("export pack", () => {
  it("names the 9:16 file next to the 4:5 download", () => {
    expect(storyFilename("headline.png")).toBe("headline-story.png");
    expect(squareFilename("headline.png")).toBe("headline-square.png");
  });

  it("insets a safe 9:16 crop so name bars sit above story chrome", () => {
    const raw = storyBoardRect(false);
    const safe = storyBoardRect(true);
    expect(safe.y).toBeGreaterThan(raw.y);
    expect(safe.y + safe.height).toBeLessThan(raw.y + raw.height);
    expect(safe.y + safe.height).toBeLessThan(STORY_HEIGHT - 40);
  });
});
