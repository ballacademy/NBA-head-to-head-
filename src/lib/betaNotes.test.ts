import { describe, expect, it } from "vitest";
import {
  buildBetaNotesShareUrl,
  parseBetaNotesSection,
} from "./betaNotes";

describe("betaNotes", () => {
  it("parses section aliases", () => {
    expect(parseBetaNotesSection("live")).toBe("live");
    expect(parseBetaNotesSection("known-limits")).toBe("limits");
    expect(parseBetaNotesSection("sample_size")).toBe("sample");
    expect(parseBetaNotesSection("bugs")).toBe("feedback");
    expect(parseBetaNotesSection("nope")).toBeNull();
  });

  it("builds share URLs", () => {
    expect(buildBetaNotesShareUrl()).toContain("hub=beta");
    expect(buildBetaNotesShareUrl("sample")).toContain("section=sample");
  });
});
