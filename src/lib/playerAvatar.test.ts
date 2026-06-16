import { describe, expect, it } from "vitest";
import { getPlayerAvatarDataUri } from "./playerAvatar";

describe("playerAvatar", () => {
  it("returns a cached cartoon avatar data uri", () => {
    const first = getPlayerAvatarDataUri("lebron-james");
    const second = getPlayerAvatarDataUri("lebron-james");

    expect(first).toMatch(/^data:image\/svg\+xml;charset=utf-8,/);
    expect(second).toBe(first);
  });
});
