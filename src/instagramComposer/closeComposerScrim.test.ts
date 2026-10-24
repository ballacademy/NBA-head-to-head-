import { describe, expect, it, vi } from "vitest";
import { closeComposerScrim } from "./closeComposerScrim";

describe("closeComposerScrim", () => {
  it("closes when the pointer is on the dimmed backdrop", () => {
    const onClose = vi.fn();
    const scrim = { id: "scrim" };
    closeComposerScrim({ target: scrim, currentTarget: scrim }, onClose);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not close when the pointer is on the sheet or a player row", () => {
    const onClose = vi.fn();
    const scrim = { id: "scrim" };
    const row = { id: "player" };
    closeComposerScrim({ target: row, currentTarget: scrim }, onClose);
    expect(onClose).not.toHaveBeenCalled();
  });
});
