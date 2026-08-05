import { describe, expect, it } from "vitest";
import {
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
