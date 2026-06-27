import { describe, expect, it } from "vitest";
import {
  getSecondsUntilDeadline,
  isDraftDeadlineElapsed,
} from "./draftTimer";

describe("draftTimer", () => {
  it("computes remaining seconds from a deadline", () => {
    const now = 1_000_000;
    const deadline = now + 5_500;

    expect(getSecondsUntilDeadline(deadline, now)).toBe(6);
    expect(isDraftDeadlineElapsed(deadline, now)).toBe(false);
    expect(isDraftDeadlineElapsed(deadline, now + 6_000)).toBe(true);
  });
});
