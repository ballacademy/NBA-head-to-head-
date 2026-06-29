import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getTeamProfileValidationMessage,
  loadTeamProfile,
  normalizeTeamProfile,
  saveTeamProfile,
  validateTeamProfile,
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
    expect(normalizeTeamProfile("  Bulls ")).toEqual({
      name: "Bulls",
    });
    expect(normalizeTeamProfile("")).toBeNull();
  });

  it("persists and reloads the saved team profile", () => {
    saveTeamProfile({ name: "Celtics" });

    expect(loadTeamProfile()).toEqual({
      name: "Celtics",
    });
  });

  it("rejects profane team names", () => {
    expect(validateTeamProfile("shit team")).toEqual({
      ok: false,
      error: "profanity",
    });
    expect(normalizeTeamProfile("shit team")).toBeNull();
    expect(getTeamProfileValidationMessage("profanity")).toMatch(/offensive/i);
  });
});
