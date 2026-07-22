import { describe, expect, it } from "vitest";
import {
  getPasswordValidationError,
  getUsernameValidationError,
  normalizeUsername,
} from "./accountCredentials";

describe("accountCredentials client helpers", () => {
  it("normalizes usernames", () => {
    expect(normalizeUsername("  FrontOffice ")).toBe("frontoffice");
  });

  it("rejects invalid usernames and short passwords", () => {
    expect(getUsernameValidationError("a")).toMatch(/3-24/);
    expect(getUsernameValidationError("ok_name")).toBeNull();
    expect(getPasswordValidationError("1234567")).toMatch(/8-128/);
    expect(getPasswordValidationError("12345678")).toBeNull();
  });
});
