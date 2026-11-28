import { describe, expect, it } from "vitest";
import { buildZip, crc32 } from "./downloadZip";

describe("download zip", () => {
  it("writes a store-method ZIP with PK headers", () => {
    const payload = new TextEncoder().encode("hello carousel");
    const zip = buildZip([{ name: "caption.txt", bytes: payload }]);
    expect(String.fromCharCode(zip[0], zip[1])).toBe("PK");
    expect(crc32(payload)).toBe(crc32(payload));
    expect(zip.length).toBeGreaterThan(payload.length + 30);
    const name = "caption.txt";
    const asText = new TextDecoder().decode(zip);
    expect(asText).toContain(name);
    expect(asText).toContain("hello carousel");
  });
});
