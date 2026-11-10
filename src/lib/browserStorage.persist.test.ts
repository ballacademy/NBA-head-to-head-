import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  beginComposerHydrateWrites,
  endComposerHydrateWrites,
  hydrateJsonStorage,
  noteComposerUserEdit,
  readJson,
  writeJson,
} from "./browserStorage";
import {
  resetDurableJsonForTests,
  unloadDurableCacheForTests,
} from "./durableJson";
import { upsertNamedGraphic, listNamedGraphics } from "../instagramComposer/composerLibrary";
import { defaultHeadlineDraft } from "../headlineComposer/headlineState";
import { defaultMockTradeDraft } from "../mockTradeComposer/mockTradeState";
import { defaultStatCardCoverDraft } from "../statCardCoverComposer/statCardCoverState";

const mockStorage = (quota = false) => {
  const memory: Record<string, string> = {};
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => memory[key] ?? null,
      setItem: (key: string, value: string) => {
        if (quota) {
          throw new Error("QuotaExceededError");
        }
        memory[key] = value;
      },
      removeItem: (key: string) => {
        delete memory[key];
      },
    },
  });
  return memory;
};

describe("composer photo persist", () => {
  beforeEach(() => {
    resetDurableJsonForTests();
    mockStorage();
  });

  afterEach(() => {
    endComposerHydrateWrites();
    vi.useRealTimers();
  });

  it("does not mark a composer unsaved on the first hydrate write", () => {
    const writes: string[] = [];
    const listeners = new Map<string, Array<(event: Event) => void>>();
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        addEventListener: (type: string, fn: (event: Event) => void) => {
          const list = listeners.get(type) ?? [];
          list.push(fn);
          listeners.set(type, list);
        },
        removeEventListener: (type: string, fn: (event: Event) => void) => {
          listeners.set(
            type,
            (listeners.get(type) ?? []).filter((item) => item !== fn),
          );
        },
        dispatchEvent: (event: Event) => {
          (listeners.get(event.type) ?? []).forEach((fn) => fn(event));
          return true;
        },
      },
    });
    const onWrite = (event: Event) => {
      writes.push((event as CustomEvent<string>).detail);
    };
    window.addEventListener("ddgm:composer-draft-write", onWrite);
    const key = "ddgm:standings-composer";
    writeJson(key, { title: "PROJECTED NBA STANDINGS" });
    expect(writes).toEqual([]);
    noteComposerUserEdit();
    writeJson(key, { title: "EASTERN CONFERENCE" });
    expect(writes).toEqual([key]);
    writeJson(key, { title: "EASTERN CONFERENCE" });
    expect(writes).toEqual([key]);
    beginComposerHydrateWrites();
    writeJson(key, { title: "PROJECTED NBA STANDINGS" });
    expect(writes).toEqual([key]);
    noteComposerUserEdit();
    writeJson(key, { title: "EASTERN CONFERENCE" });
    expect(writes).toEqual([key, key]);
    window.removeEventListener("ddgm:composer-draft-write", onWrite);
  });

  it("does not mark unsaved for the hop rewrite burst", () => {
    vi.useFakeTimers();
    const writes: string[] = [];
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: (event: Event) => {
          if (event.type === "ddgm:composer-draft-write") {
            writes.push((event as CustomEvent<string>).detail);
          }
          return true;
        },
        setTimeout,
        clearTimeout,
      },
    });
    const key = "ddgm:quote-composer";
    writeJson(key, { title: "THE QUOTE" });
    beginComposerHydrateWrites();
    writeJson(key, { title: "THE QUOTE" });
    writeJson(key, { title: "Hydrate rewrite" });
    expect(writes).toEqual([]);
    vi.advanceTimersByTime(2000);
    noteComposerUserEdit();
    writeJson(key, { title: "Typed title" });
    expect(writes).toEqual([key]);
    endComposerHydrateWrites();
    vi.useRealTimers();
  });

  it("reopens the same graphic with its photo, pan, and slot after a new-tab hydrate", async () => {
    const coverKey = "ddgm:stat-card-cover-composer";
    const headlineKey = "ddgm:headline-composer";
    const cover = {
      ...defaultStatCardCoverDraft(),
      slots: defaultStatCardCoverDraft().slots.map((slot, index) =>
        index === 1
          ? {
              ...slot,
              playerId: "3112335",
              teamId: "DEN",
              firstName: "Nikola",
              lastName: "Jokic",
              photoSrc: "data:image/png;base64,slot2",
              customPhoto: true,
              pan: { x: 0.44, y: 0.63, zoom: 1.4, rotate: 8 },
            }
          : slot,
      ),
    };
    const headline = {
      ...defaultHeadlineDraft(),
      photoSrc: "data:image/png;base64,headline",
      customPhoto: true,
      pan: { x: 0.5, y: 0.28, zoom: 1.2, rotate: 0 },
    };
    writeJson(coverKey, cover);
    writeJson(headlineKey, headline);
    unloadDurableCacheForTests();
    await hydrateJsonStorage();
    const restoredCover = readJson<typeof cover>(coverKey);
    const restoredHeadline = readJson<typeof headline>(headlineKey);
    expect(restoredCover?.slots[1]?.photoSrc).toBe("data:image/png;base64,slot2");
    expect(restoredCover?.slots[1]?.customPhoto).toBe(true);
    expect(restoredCover?.slots[1]?.pan).toEqual({
      x: 0.44,
      y: 0.63,
      zoom: 1.4,
      rotate: 8,
    });
    expect(restoredCover?.slots[0]?.photoSrc).toBeNull();
    expect(restoredCover?.slots[2]?.photoSrc).toBeNull();
    expect(restoredHeadline?.photoSrc).toBe("data:image/png;base64,headline");
    expect(restoredHeadline?.pan.zoom).toBe(1.2);
    const tradeKey = "ddgm:mock-trade-composer";
    const trade = {
      ...defaultMockTradeDraft(),
      sides: defaultMockTradeDraft().sides.map((side, index) =>
        index === 0
          ? {
              ...side,
              teamId: "BOS",
              players: [
                {
                  ...side.players[0]!,
                  photoSrc: "data:image/png;base64,trade",
                  customPhoto: true,
                  pan: { x: 0.4, y: 0.3, zoom: 1.15, rotate: 0 },
                },
              ],
            }
          : side,
      ),
    };
    writeJson(tradeKey, trade);
    unloadDurableCacheForTests();
    await hydrateJsonStorage();
    const restoredTrade = readJson<typeof trade>(tradeKey);
    expect(restoredTrade?.sides[0]?.players[0]?.photoSrc).toBe(
      "data:image/png;base64,trade",
    );
    expect(restoredTrade?.sides[0]?.players[0]?.pan.zoom).toBe(1.15);
    expect(restoredTrade?.sides[1]?.players[0]?.photoSrc).toBeNull();
    expect(defaultHeadlineDraft().photoSrc).toBeNull();
    expect(defaultStatCardCoverDraft().slots.every((slot) => !slot.photoSrc)).toBe(
      true,
    );
  });

  it("keeps photos when localStorage quota fails and on a named save", async () => {
    mockStorage(true);
    const key = "ddgm:quote-composer";
    const board = {
      quote: "STAY READY",
      photoSrc: `data:image/png;base64,${"ab".repeat(2000)}`,
      customPhoto: true,
      pan: { x: 0.5, y: 0.4, zoom: 1.1, rotate: 0 },
    };
    writeJson(key, board);
    expect(readJson<typeof board>(key)?.photoSrc).toBe(board.photoSrc);
    unloadDurableCacheForTests();
    await hydrateJsonStorage();
    expect(readJson<typeof board>(key)?.photoSrc).toBe(board.photoSrc);
    const savesKey = "ddgm:stat-card-cover-composer:saves";
    const { saved } = upsertNamedGraphic(savesKey, "Oct 15 cover", {
      slots: [
        { photoSrc: "data:image/png;base64,one", customPhoto: true, pan: { x: 0.2, y: 0.3, zoom: 1, rotate: 0 } },
        { photoSrc: "data:image/png;base64,two", customPhoto: true, pan: { x: 0.5, y: 0.5, zoom: 1.3, rotate: 0 } },
        { photoSrc: null, customPhoto: false, pan: { x: 0.5, y: 0.22, zoom: 1, rotate: 0 } },
      ],
    });
    expect(listNamedGraphics(savesKey)[0]?.board).toEqual(saved.board);
    expect(
      (listNamedGraphics(savesKey)[0]?.board as { slots: { photoSrc: string | null }[] })
        .slots[1]?.photoSrc,
    ).toBe("data:image/png;base64,two");
  });
});
