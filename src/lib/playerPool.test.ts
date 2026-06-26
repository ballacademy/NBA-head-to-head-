import { describe, expect, it } from "vitest";
import { ACTIVE_ROSTER_AS_OF, ACTIVE_ROSTER_AS_OF_LABEL } from "./playerPool";

describe("playerPool roster metadata", () => {
  it("tracks the active roster as-of date", () => {
    expect(ACTIVE_ROSTER_AS_OF).toBe("2026-06-25");
    expect(ACTIVE_ROSTER_AS_OF_LABEL).toBe("June 25, 2026");
  });
});
