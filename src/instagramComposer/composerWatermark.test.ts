import { describe, expect, it } from "vitest";
import {
  composerWatermarkOpacity,
  parseComposerWatermark,
} from "./composerWatermark";

describe("composer watermark", () => {
  it("parses faint, medium, and off", () => {
    expect(parseComposerWatermark(undefined)).toBe("faint");
    expect(parseComposerWatermark("medium")).toBe("medium");
    expect(parseComposerWatermark("off")).toBe("off");
    expect(composerWatermarkOpacity("off")).toBe(0);
    expect(composerWatermarkOpacity("medium")).toBeGreaterThan(
      composerWatermarkOpacity("faint"),
    );
  });
});
