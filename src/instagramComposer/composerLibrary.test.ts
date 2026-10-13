import { beforeEach, describe, expect, it } from "vitest";
import {
  deleteNamedGraphic,
  listNamedGraphics,
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
});
