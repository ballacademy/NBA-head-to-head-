import { describe, expect, it } from "vitest";
import { storyFilename } from "./exportPack";

describe("export pack", () => {
  it("names the 9:16 file next to the 4:5 download", () => {
    expect(storyFilename("headline.png")).toBe("headline-story.png");
  });
});
