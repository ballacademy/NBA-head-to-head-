import { describe, expect, it } from "vitest";
import { formatGmRecordLine, formatGmModeRecord } from "./gmStats";
import { formatOrdinal } from "./ordinal";

describe("gm stats presentation helpers", () => {
  it("formats mode records without a trailing label colon in the value", () => {
    expect(formatGmRecordLine(26, 25)).toBe("26-25");
    expect(formatGmRecordLine(6, 13, 1)).toBe("6-13-1");
  });

  it("keeps the combined label helper for callers that still need it", () => {
    expect(formatGmModeRecord("Casual H2H", 26, 25)).toBe("Casual H2H: 26-25");
  });

  it("formats percentile ordinals professionally", () => {
    expect(formatOrdinal(100)).toBe("100th");
    expect(formatOrdinal(73)).toBe("73rd");
    expect(formatOrdinal(1)).toBe("1st");
  });
});
