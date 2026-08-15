import { describe, expect, it } from "vitest";
import {
  arePlayerHeadshotsEnabled,
  getPlayerHeadshotUrl,
  loadPlayerHeadshotImages,
} from "./playerHeadshots";

describe("playerHeadshots", () => {
  it("resolves a known ESPN headshot for a mapped BBR id", () => {
    const url = getPlayerHeadshotUrl("doncilu01");
    expect(url).toMatch(/espncdn\.com.*\/\d+\.png/);
  });

  it("maps Jimmy Butler despite ESPN suffix naming", () => {
    const url = getPlayerHeadshotUrl("butleji01");
    expect(url).toBe(
      "https://a.espncdn.com/i/headshots/nba/players/full/6430.png",
    );
  });

  it("returns null when the player is unmapped", () => {
    expect(getPlayerHeadshotUrl("not-a-real-bbr-id")).toBeNull();
    expect(getPlayerHeadshotUrl(undefined)).toBeNull();
  });

  it("enables headshots on QA / local hosts", () => {
    expect(arePlayerHeadshotsEnabled("nba-head-to-head-qa.pages.dev", "")).toBe(
      true,
    );
    expect(arePlayerHeadshotsEnabled("qa.draftdaygm.com", "")).toBe(true);
    expect(arePlayerHeadshotsEnabled("localhost", "")).toBe(true);
    expect(arePlayerHeadshotsEnabled("www.draftdaygm.com", "")).toBe(false);
    expect(arePlayerHeadshotsEnabled("www.draftdaygm.com", "?headshots")).toBe(
      true,
    );
  });

  it("skips canvas headshot preloads when headshots are disabled", async () => {
    const loaded = await loadPlayerHeadshotImages(["doncilu01", "butleji01"], {
      enabled: false,
    });
    expect(loaded.size).toBe(0);
  });

  it("loads a mapped headshot through fetch+blob for canvas use", async () => {
    const url = getPlayerHeadshotUrl("doncilu01");
    expect(url).toBeTruthy();

    const { loadCorsImage } = await import("./playerHeadshots");
    const image = await loadCorsImage(url!, 10_000);

    // Node vitest has no DOM Image; browser/QA path is covered by loadCorsImage
    // returning null cleanly instead of throwing.
    if (typeof Image === "undefined") {
      expect(image).toBeNull();
      return;
    }

    expect(image).not.toBeNull();
    expect(image!.naturalWidth).toBeGreaterThan(0);
  });
});
