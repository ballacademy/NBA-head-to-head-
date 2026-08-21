import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type MockEl = {
  style: { overflow: string };
  classList: {
    add: (name: string) => void;
    remove: (name: string) => void;
    contains: (name: string) => boolean;
  };
};

const createMockElement = (): MockEl => {
  const classes = new Set<string>();
  return {
    style: { overflow: "" },
    classList: {
      add: (name) => {
        classes.add(name);
      },
      remove: (name) => {
        classes.delete(name);
      },
      contains: (name) => classes.has(name),
    },
  };
};

const installDocumentMock = () => {
  const html = createMockElement();
  const body = createMockElement();
  const doc = {
    documentElement: html,
    body,
    querySelectorAll: () => [] as unknown as NodeListOf<HTMLElement>,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  vi.stubGlobal("document", doc);
  return doc;
};

describe("lockBackgroundScroll nesting", () => {
  let doc: ReturnType<typeof installDocumentMock>;

  beforeEach(async () => {
    vi.resetModules();
    doc = installDocumentMock();
    const { resetBackgroundScrollLockForTests } = await import("./useDialogA11y");
    resetBackgroundScrollLockForTests();
  });

  afterEach(async () => {
    const { resetBackgroundScrollLockForTests } = await import("./useDialogA11y");
    resetBackgroundScrollLockForTests();
    vi.unstubAllGlobals();
  });

  it("does not leave overflow hidden after nested private+matchmaking unlock", async () => {
    const { lockBackgroundScroll } = await import("./useDialogA11y");

    const unlockModal = lockBackgroundScroll(() => null);
    expect(doc.body.style.overflow).toBe("hidden");
    expect(doc.body.classList.contains("ddgm-dialog-open")).toBe(true);

    // Second lock while the first is still active (modal + overlay).
    const unlockOverlay = lockBackgroundScroll(() => null);
    expect(doc.body.style.overflow).toBe("hidden");

    // Modal closes first while matchmaking overlay remains.
    unlockModal();
    expect(doc.body.style.overflow).toBe("hidden");
    expect(doc.body.classList.contains("ddgm-dialog-open")).toBe(true);

    // Overlay closes — page must scroll again.
    unlockOverlay();
    expect(doc.body.style.overflow).toBe("");
    expect(doc.documentElement.style.overflow).toBe("");
    expect(doc.body.classList.contains("ddgm-dialog-open")).toBe(false);
  });

  it("forceUnlock clears a stuck lock", async () => {
    const { forceUnlockBackgroundScroll, lockBackgroundScroll } = await import(
      "./useDialogA11y"
    );

    lockBackgroundScroll(() => null);
    expect(doc.body.style.overflow).toBe("hidden");

    forceUnlockBackgroundScroll();
    expect(doc.body.style.overflow).toBe("");
    expect(doc.body.classList.contains("ddgm-dialog-open")).toBe(false);
  });

  it("forceUnlock clears orphaned overflow without an active snapshot", async () => {
    const { forceUnlockBackgroundScroll } = await import("./useDialogA11y");

    doc.body.style.overflow = "hidden";
    doc.documentElement.style.overflow = "hidden";
    doc.body.classList.add("ddgm-dialog-open");
    doc.documentElement.classList.add("ddgm-dialog-open");

    forceUnlockBackgroundScroll();
    expect(doc.body.style.overflow).toBe("");
    expect(doc.documentElement.style.overflow).toBe("");
    expect(doc.body.classList.contains("ddgm-dialog-open")).toBe(false);
    expect(doc.documentElement.classList.contains("ddgm-dialog-open")).toBe(
      false,
    );
  });
});
