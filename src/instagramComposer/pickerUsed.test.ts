import { describe, expect, it } from "vitest";
import { usedChipLabel } from "./pickerUsed";

describe("picker used chip", () => {
  it("labels taken players and teams as on the board", () => {
    expect(usedChipLabel("On S")).toBe("On board · S");
    expect(usedChipLabel("On A")).toBe("On board · A");
    expect(usedChipLabel("This row")).toBe("On board · this row");
    expect(usedChipLabel("Now #3")).toBe("Used · #3");
    expect(usedChipLabel("This slot")).toBe("On board");
  });
});
