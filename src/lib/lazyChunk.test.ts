import { describe, expect, it } from "vitest";
import { isChunkLoadError } from "./lazyChunk";

describe("isChunkLoadError", () => {
  it("detects browser module-script failures", () => {
    expect(
      isChunkLoadError(new TypeError("Importing a module script failed.")),
    ).toBe(true);
    expect(
      isChunkLoadError(
        new TypeError(
          "Failed to fetch dynamically imported module: https://example.test/assets/x.js",
        ),
      ),
    ).toBe(true);
    expect(isChunkLoadError(new Error("ChunkLoadError"))).toBe(true);
  });

  it("ignores unrelated errors", () => {
    expect(isChunkLoadError(new Error("Cannot read properties of null"))).toBe(
      false,
    );
    expect(isChunkLoadError(null)).toBe(false);
  });
});
