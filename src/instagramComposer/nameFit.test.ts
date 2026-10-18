import { describe, expect, it } from "vitest";
import {
  abbreviateOverflowName,
  fittedCellNames,
  wrapNameToWidth,
} from "./nameFit";

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

describe("overflow abbreviation", () => {
  it("keeps names that already fit", () => {
    expect(abbreviateOverflowName("Doncic", 10, measure)).toBe("DONCIC");
    expect(abbreviateOverflowName("James", 8, measure)).toBe("JAMES");
  });

  it("shortens a hyphenated last name with a period, preferring the longer fit", () => {
    expect(abbreviateOverflowName("Gilgeous-Alexander", 11, measure)).toBe(
      "GILGEOUS-A.",
    );
    expect(abbreviateOverflowName("Gilgeous-Alexander", 13, measure)).toBe(
      "G.-ALEXANDER",
    );
    expect(abbreviateOverflowName("Gilgeous-Alexander", 18, measure)).toBe(
      "GILGEOUS-ALEXANDER",
    );
  });

  it("keeps an F. Last prefix and abbreviates the last name", () => {
    expect(abbreviateOverflowName("S. Gilgeous-Alexander", 14, measure)).toBe(
      "S. GILGEOUS-A.",
    );
    expect(abbreviateOverflowName("V. Wembanyama", 12, measure)).toBe(
      "V. WEMBANYA.",
    );
    expect(abbreviateOverflowName("N. Jokic", 10, measure)).toBe("N. JOKIC");
  });

  it("truncates a long unhyphenated last name with a period", () => {
    expect(abbreviateOverflowName("Antetokounmpo", 8, measure)).toBe(
      "ANTETOK.",
    );
    expect(abbreviateOverflowName("Antetokounmpo", 13, measure)).toBe(
      "ANTETOKOUNMPO",
    );
    expect(abbreviateOverflowName("Wembanyama", 9, measure)).toBe("WEMBANYA.");
    expect(abbreviateOverflowName("Wembanyama", 9, measure)).not.toMatch(/\s/);
  });

  it("fits cell captions without shrinking the type size", () => {
    const names = fittedCellNames("Shai", "Gilgeous-Alexander", 84, 14, 11);
    expect(names.firstName).toBe("SHAI");
    expect(names.lastName.endsWith(".")).toBe(true);
    expect(names.lastName).not.toBe("GILGEOUS-ALEXANDER");
    const short = fittedCellNames("Luka", "Doncic", 84, 14, 11);
    expect(short).toEqual({ firstName: "LUKA", lastName: "DONCIC" });
  });
});
