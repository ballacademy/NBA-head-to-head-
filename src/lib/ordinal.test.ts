import { describe, expect, it } from "vitest";
import { formatOrdinal } from "./ordinal";

describe("formatOrdinal", () => {
  it("formats standard ordinals", () => {
    expect(formatOrdinal(1)).toBe("1st");
    expect(formatOrdinal(2)).toBe("2nd");
    expect(formatOrdinal(3)).toBe("3rd");
    expect(formatOrdinal(4)).toBe("4th");
  });

  it("handles teen exceptions", () => {
    expect(formatOrdinal(11)).toBe("11th");
    expect(formatOrdinal(12)).toBe("12th");
    expect(formatOrdinal(13)).toBe("13th");
  });

  it("handles larger values used in daily percentiles", () => {
    expect(formatOrdinal(21)).toBe("21st");
    expect(formatOrdinal(22)).toBe("22nd");
    expect(formatOrdinal(23)).toBe("23rd");
    expect(formatOrdinal(73)).toBe("73rd");
    expect(formatOrdinal(92)).toBe("92nd");
    expect(formatOrdinal(100)).toBe("100th");
  });
});
