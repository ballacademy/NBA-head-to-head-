import { describe, expect, it } from "vitest";
import {
  isBenignBrowserError,
  isShareDismissalError,
  isUserDismissalError,
} from "./appErrors";

describe("appErrors dismissal helpers", () => {
  it("treats AbortError as a user dismissal", () => {
    const abort = new DOMException("The operation was aborted.", "AbortError");
    expect(isUserDismissalError(abort)).toBe(true);
    expect(isShareDismissalError(abort)).toBe(true);
  });

  it("treats share NotAllowedError as a share dismissal only", () => {
    const denied = new DOMException("Share canceled", "NotAllowedError");
    expect(isUserDismissalError(denied)).toBe(false);
    expect(isShareDismissalError(denied)).toBe(true);
  });

  it("does not treat unrelated errors as dismissals", () => {
    expect(isUserDismissalError(new Error("boom"))).toBe(false);
    expect(isShareDismissalError(new Error("boom"))).toBe(false);
    expect(isUserDismissalError(null)).toBe(false);
  });
});

describe("isBenignBrowserError", () => {
  it("filters ResizeObserver and cross-origin script noise", () => {
    expect(
      isBenignBrowserError({
        message: "ResizeObserver loop limit exceeded",
      } as ErrorEvent),
    ).toBe(true);
    expect(
      isBenignBrowserError({ message: "Script error." } as ErrorEvent),
    ).toBe(true);
    expect(
      isBenignBrowserError({
        message: "boom",
        filename: "chrome-extension://abc/content.js",
      } as ErrorEvent),
    ).toBe(true);
    expect(
      isBenignBrowserError({
        message: "Real app failure",
        filename: "https://example.com/app.js",
      } as ErrorEvent),
    ).toBe(false);
  });
});
