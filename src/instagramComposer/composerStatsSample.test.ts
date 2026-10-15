import { describe, expect, it } from "vitest";
import {
  composerStatsSampleLabel,
  parseComposerStatsSample,
} from "./composerStatsSample";

describe("composer stats sample", () => {
  it("defaults to preseason and only treats regular as last-season fallback", () => {
    expect(parseComposerStatsSample(undefined)).toBe("preseason");
    expect(parseComposerStatsSample("preseason")).toBe("preseason");
    expect(parseComposerStatsSample("regular")).toBe("regular");
    expect(parseComposerStatsSample("rs")).toBe("preseason");
    expect(composerStatsSampleLabel("preseason")).toBe("Preseason");
    expect(composerStatsSampleLabel("regular")).toBe("Regular season");
  });
});
