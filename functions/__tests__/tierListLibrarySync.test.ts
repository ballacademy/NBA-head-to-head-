import { describe, expect, it } from "vitest";
import {
  emptyTierListAccountPayload,
  mergeTierListAccountPayload,
  normalizeTierListAccountPayload,
  parseTierListAccountJson,
} from "../../src/lib/tierListLibraryShared";
import { createDefaultTier, normalizeTierListState } from "../../src/lib/tierList";

describe("tierListLibrarySync", () => {
  it("normalizes partial tier list account payloads", () => {
    expect(
      normalizeTierListAccountPayload({
        current: { title: "Board", tiers: createDefaultTier() },
        currentUpdatedAt: 50,
        library: { documents: [] },
      }),
    ).toMatchObject({
      currentUpdatedAt: 50,
    });
  });

  it("merges saved documents by id", () => {
    const left = emptyTierListAccountPayload();
    left.library.documents = [
      {
        id: "doc-a",
        title: "Older",
        tiers: createDefaultTier(),
        savedAt: 100,
      },
    ];
    const right = emptyTierListAccountPayload();
    right.library.documents = [
      {
        id: "doc-a",
        title: "Newer",
        tiers: createDefaultTier(),
        savedAt: 200,
      },
    ];

    expect(
      mergeTierListAccountPayload(left, right).library.documents[0]?.title,
    ).toBe("Newer");
  });

  it("parses invalid JSON as empty account payload", () => {
    const parsed = parseTierListAccountJson("{");
    expect(parsed.currentUpdatedAt).toBe(0);
    expect(parsed.library.documents).toEqual([]);
    expect(parsed.current.tiers).toHaveLength(6);
  });
});
