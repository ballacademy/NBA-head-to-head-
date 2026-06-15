import { describe, expect, it } from "vitest";
import {
  hasAllDefenseAccolade,
  isAllDefenseFirstTeam,
} from "./allDefense";

describe("allDefense", () => {
  it("tracks recent all-defense honorees", () => {
    expect(hasAllDefenseAccolade("greendr01")).toBe(true);
    expect(hasAllDefenseAccolade("goberru01")).toBe(true);
    expect(hasAllDefenseAccolade("carusal01")).toBe(true);
    expect(hasAllDefenseAccolade("doncilu01")).toBe(false);
    expect(isAllDefenseFirstTeam("greendr01")).toBe(true);
    expect(isAllDefenseFirstTeam("goberru01")).toBe(true);
  });
});
