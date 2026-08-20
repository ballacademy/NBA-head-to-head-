import { beforeEach, describe, expect, it, vi } from "vitest";
import { markPlayerAccountLinked } from "./accountGate";
import { setPlayerIdentity } from "./playerIdentity";
import {
  createDefaultTier,
  loadTierListLibrary,
  loadTierListState,
  normalizeTierListState,
  saveTierListState,
  saveTierListToLibrary,
} from "./tierList";
import {
  pullAndMergeTierListLibrary,
  pushTierListLibraryIfLinked,
  resetTierListLibraryPullGate,
} from "./tierListLibraryRemote";

vi.mock("./accountGate", async () => {
  const actual = await vi.importActual<typeof import("./accountGate")>(
    "./accountGate",
  );
  return {
    ...actual,
    isPlayerAccountLinked: vi.fn(async () => true),
  };
});

vi.mock("./tierListLibraryApi", () => ({
  fetchRemoteTierListLibrary: vi.fn(),
  pushRemoteTierListLibrary: vi.fn(),
}));

const storage = new Map<string, string>();

beforeEach(() => {
  storage.clear();
  resetTierListLibraryPullGate();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
    clear: () => {
      storage.clear();
    },
  });
  setPlayerIdentity("player-linked");
  markPlayerAccountLinked("player-linked", "hooper");
});

describe("tierListLibraryRemote", () => {
  it("pulls remote tier lists and merges local drafts", async () => {
    saveTierListState(
      normalizeTierListState({
        title: "Local board",
        tiers: createDefaultTier(),
      }),
    );
    saveTierListToLibrary(loadTierListState());

    const { fetchRemoteTierListLibrary, pushRemoteTierListLibrary } =
      await import("./tierListLibraryApi");
    vi.mocked(fetchRemoteTierListLibrary).mockResolvedValue({
      playerId: "player-linked",
      updatedAt: "2026-08-01T00:00:00.000Z",
      library: {
        current: normalizeTierListState({
          title: "Remote board",
          tiers: createDefaultTier(),
        }),
        currentUpdatedAt: 50,
        library: {
          documents: [
            {
              id: "remote-doc",
              title: "Remote saved",
              tiers: createDefaultTier(),
              savedAt: 200,
            },
          ],
        },
      },
    });
    vi.mocked(pushRemoteTierListLibrary).mockResolvedValue(null);

    const merged = await pullAndMergeTierListLibrary("player-linked");

    expect(merged?.current.title).toBe("Local board");
    expect(merged?.library.documents.some((doc) => doc.id === "remote-doc")).toBe(
      true,
    );
    expect(loadTierListLibrary().documents.some((doc) => doc.id === "remote-doc")).toBe(
      true,
    );
  });

  it("does not push before a successful pull unless forced", async () => {
    const { pushRemoteTierListLibrary } = await import("./tierListLibraryApi");
    vi.mocked(pushRemoteTierListLibrary).mockResolvedValue(null);

    saveTierListState(
      normalizeTierListState({
        title: "Draft",
        tiers: createDefaultTier(),
      }),
    );

    await expect(
      pushTierListLibraryIfLinked("player-linked"),
    ).resolves.toBe(false);

    vi.mocked(pushRemoteTierListLibrary).mockResolvedValue({
      playerId: "player-linked",
      updatedAt: "2026-08-01T00:00:00.000Z",
      library: {
        current: loadTierListState(),
        currentUpdatedAt: Date.now(),
        library: loadTierListLibrary(),
      },
    });
    await expect(
      pushTierListLibraryIfLinked("player-linked", { force: true }),
    ).resolves.toBe(true);
  });
});
