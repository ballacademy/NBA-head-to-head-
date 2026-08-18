import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadDraftClockMuted,
  prefersReducedMotion,
  saveDraftClockMuted,
  shouldPlayDraftClockPing,
} from "./draftClockPrefs";

const storage = new Map<string, string>();

const localStorageMock = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  },
  removeItem: (key: string) => {
    storage.delete(key);
  },
};

describe("draftClockPrefs", () => {
  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("localStorage", localStorageMock);
    vi.stubGlobal("window", {
      ...globalThis.window,
      matchMedia: vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  it("defaults muted when reduced motion is preferred", () => {
    vi.stubGlobal("window", {
      ...globalThis.window,
      matchMedia: vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
    storage.clear();
    expect(prefersReducedMotion()).toBe(true);
    expect(loadDraftClockMuted()).toBe(true);
    expect(shouldPlayDraftClockPing()).toBe(false);
  });

  it("persists an explicit mute preference", () => {
    expect(loadDraftClockMuted()).toBe(false);
    saveDraftClockMuted(true);
    expect(loadDraftClockMuted()).toBe(true);
    saveDraftClockMuted(false);
    expect(shouldPlayDraftClockPing()).toBe(true);
  });
});
