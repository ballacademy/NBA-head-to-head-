import { describe, expect, it } from "vitest";
import { wrapNameToWidth } from "./nameFit";

const measure = (value: string) => value.length;

describe("name wrap", () => {
  it("keeps short first and last names on one line each", () => {
    expect(wrapNameToWidth("Giannis", 12, measure)).toEqual(["GIANNIS"]);
    expect(wrapNameToWidth("Antetokounmpo", 16, measure)).toEqual([
      "ANTETOKOUNMPO",
    ]);
  });

  it("wraps Shai’s hyphenated last name instead of clipping", () => {
    expect(wrapNameToWidth("Gilgeous-Alexander", 10, measure)).toEqual([
      "GILGEOUS-",
      "ALEXANDER",
    ]);
  });
});
