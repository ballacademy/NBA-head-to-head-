import { describe, expect, it } from "vitest";
import {
  composerStatsSampleLabel,
  parseComposerStatsSample,
} from "./composerStatsSample";

describe("composer stats sample", () => {
  it("defaults to regular season now that RS has started", () => {
    expect(parseComposerStatsSample(undefined)).toBe("regular");
    expect(parseComposerStatsSample("preseason")).toBe("preseason");
    expect(parseComposerStatsSample("regular")).toBe("regular");
    expect(parseComposerStatsSample("rs")).toBe("regular");
    expect(composerStatsSampleLabel("preseason")).toBe("Preseason");
    expect(composerStatsSampleLabel("regular")).toBe("Regular season");
  });
});
