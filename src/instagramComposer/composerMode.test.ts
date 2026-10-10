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
});
