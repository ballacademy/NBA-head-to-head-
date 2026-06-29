import { describe, expect, it } from "vitest";
import { containsProfanity } from "./profanity";

describe("profanity", () => {
  it("allows normal team names", () => {
    expect(containsProfanity("Bulls")).toBe(false);
    expect(containsProfanity("Classic City")).toBe(false);
    expect(containsProfanity("Grassroots")).toBe(false);
    expect(containsProfanity("Massachusetts")).toBe(false);
  });

  it("blocks obvious profanity and slurs", () => {
    expect(containsProfanity("fuck")).toBe(true);
    expect(containsProfanity("sh1t show")).toBe(true);
    expect(containsProfanity("F U C K")).toBe(true);
    expect(containsProfanity("big ass team")).toBe(true);
    expect(containsProfanity("nazi")).toBe(true);
  });
});
