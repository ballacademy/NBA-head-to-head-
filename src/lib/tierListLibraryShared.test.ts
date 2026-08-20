import { describe, expect, it } from "vitest";
import {
  emptyTierListAccountPayload,
  mergeTierListAccountPayload,
  normalizeTierListAccountPayload,
  parseTierListAccountJson,
} from "./tierListLibraryShared";
import { createDefaultTier, normalizeTierListState } from "./tierList";

describe("tierListLibraryShared", () => {
  it("normalizes partial tier list account payloads", () => {
    expect(
      normalizeTierListAccountPayload({
        current: { title: "My board", tiers: createDefaultTier() },
        currentUpdatedAt: 100,
        library: { documents: [] },
      }),
    ).toMatchObject({
      currentUpdatedAt: 100,
      library: { documents: [] },
    });
  });

  it("merges saved documents by id with newest savedAt", () => {
    const left = emptyTierListAccountPayload();
    left.library.documents = [
      {
        id: "doc-a",
        title: "Board A",
        tiers: createDefaultTier(),
        savedAt: 100,
      },
    ];
    const right = emptyTierListAccountPayload();
    right.library.documents = [
      {
        id: "doc-a",
        title: "Board A v2",
        tiers: createDefaultTier(),
        savedAt: 200,
      },
      {
        id: "doc-b",
        title: "Board B",
        tiers: createDefaultTier(),
        savedAt: 150,
      },
    ];

    const merged = mergeTierListAccountPayload(left, right);
    expect(merged.library.documents).toHaveLength(2);
    expect(merged.library.documents[0]?.title).toBe("Board A v2");
    expect(merged.library.documents[1]?.id).toBe("doc-b");
  });

  it("prefers the board with the newer currentUpdatedAt", () => {
    const left = emptyTierListAccountPayload();
    left.current = normalizeTierListState({
      title: "Local board",
      tiers: createDefaultTier(),
    });
    left.currentUpdatedAt = 300;

    const right = emptyTierListAccountPayload();
    right.current = normalizeTierListState({
      title: "Remote board",
      tiers: createDefaultTier(),
    });
    right.currentUpdatedAt = 100;

    expect(
      mergeTierListAccountPayload(left, right).current.title,
    ).toBe("Local board");
  });

  it("parses invalid JSON as empty account payload", () => {
    const parsed = parseTierListAccountJson("{");
    expect(parsed.currentUpdatedAt).toBe(0);
    expect(parsed.library.documents).toEqual([]);
    expect(parsed.current.tiers).toHaveLength(6);
  });
});
