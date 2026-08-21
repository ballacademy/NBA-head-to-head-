import { describe, expect, it } from "vitest";
import {
  PRIVATE_REMATCH_TTL_MS,
  privateRematchExpiresAt,
} from "../lib/privateRematches";

describe("privateRematches helpers", () => {
  it("uses a shorter TTL than private room codes", () => {
    expect(PRIVATE_REMATCH_TTL_MS).toBe(3 * 60 * 1000);
    const from = Date.parse("2026-08-21T00:00:00.000Z");
    expect(privateRematchExpiresAt(from)).toBe("2026-08-21T00:03:00.000Z");
  });
});
