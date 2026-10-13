import { beforeEach, describe, expect, it } from "vitest";
import {
  COMPOSER_LIBRARY_KIND,
  deleteNamedGraphic,
  exportComposerLibrary,
  importComposerLibrary,
  listNamedGraphics,
  parseComposerLibraryFile,
  upsertNamedGraphic,
} from "./composerLibrary";

describe("named composer graphics", () => {
  beforeEach(() => {
    const memory: Record<string, string> = {};
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => memory[key] ?? null,
        setItem: (key: string, value: string) => {
          memory[key] = value;
        },
        removeItem: (key: string) => {
          delete memory[key];
        },
      },
    });
  });

  it("saves and loads a named board without storing photos separately", () => {
    const key = "test:library";
    const board = { title: "BEST PG", rank: "BEST" };
    const { saves, saved } = upsertNamedGraphic(key, "Top 10 PGs", board);
    expect(saves).toHaveLength(1);
    expect(saved.name).toBe("Top 10 PGs");
    expect(saved.board).toEqual(board);
    expect(listNamedGraphics(key)[0]?.board).toEqual(board);
    const gone = deleteNamedGraphic(key, saved.id);
    expect(gone).toHaveLength(0);
  });

  it("exports and imports the whole named-save library for other devices", () => {
    upsertNamedGraphic("ddgm:tier-list-composer:saves", "Gold S", {
      title: "S TIER",
    });
    const file = exportComposerLibrary();
    expect(file.kind).toBe(COMPOSER_LIBRARY_KIND);
    expect(parseComposerLibraryFile(file)).not.toBeNull();
    expect(parseComposerLibraryFile({ title: "nope" })).toBeNull();
    expect(file.libraries["ddgm:tier-list-composer:saves"]).toHaveLength(1);
    const memory: Record<string, string> = {};
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => memory[key] ?? null,
        setItem: (key: string, value: string) => {
          memory[key] = value;
        },
        removeItem: (key: string) => {
          delete memory[key];
        },
      },
    });
    expect(listNamedGraphics("ddgm:tier-list-composer:saves")).toHaveLength(0);
    const result = importComposerLibrary(file);
    expect(result.keys).toBe(1);
    expect(result.saves).toBe(1);
    expect(listNamedGraphics("ddgm:tier-list-composer:saves")[0]?.name).toBe(
      "Gold S",
    );
  });
});
