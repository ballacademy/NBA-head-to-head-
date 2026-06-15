import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadTeamProfile,
  normalizeTeamProfile,
  saveTeamProfile,
} from "./teamProfile";

const storage = new Map<string, string>();

const localStorageMock = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  },
  clear: () => {
    storage.clear();
  },
};

describe("teamProfile", () => {
  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("localStorage", localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("normalizes trimmed team names", () => {
    expect(normalizeTeamProfile("  Chicago ", "  Bulls ")).toEqual({
      city: "Chicago",
      name: "Bulls",
    });
    expect(normalizeTeamProfile("Chicago", "")).toBeNull();
  });

  it("persists and reloads the saved team profile", () => {
    saveTeamProfile({ city: "Boston", name: "Celtics" });

    expect(loadTeamProfile()).toEqual({
      city: "Boston",
      name: "Celtics",
    });
  });
});
