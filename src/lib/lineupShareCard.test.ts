import { describe, expect, it } from "vitest";
import {
  buildLineupShareCardText,
  resolveShareCardStatDisplay,
  resolveShareCardTitle,
  type LineupShareCardInput,
} from "./lineupShareCard";
import type { Player } from "./types";

const baseInput = (
  overrides: Partial<LineupShareCardInput> = {},
): LineupShareCardInput => ({
  teamName: "Midnight Foxes",
  accent: "#22c55e",
  ovr: 88,
  lineup: [] as Player[],
  ...overrides,
});

describe("lineupShareCard header helpers", () => {
  it("uses teamName as the title by default", () => {
    expect(resolveShareCardTitle(baseInput())).toBe("Midnight Foxes");
  });

  it("prefers headline when set", () => {
    expect(
      resolveShareCardTitle(
        baseInput({ headline: "Most Assists · Basic" }),
      ),
    ).toBe("Most Assists · Basic");
  });

  it("falls back to OVR when no custom stat is provided", () => {
    expect(resolveShareCardStatDisplay(baseInput())).toEqual({
      custom: false,
      value: "88",
      label: "OVR",
      overflow: 0,
    });

    expect(
      resolveShareCardStatDisplay(baseInput({ ovrOverflow: 4 })),
    ).toEqual({
      custom: false,
      value: "88 (+4)",
      label: "OVR",
      overflow: 4,
    });
  });

  it("overrides OVR with Daily-style stat fields", () => {
    const stat = resolveShareCardStatDisplay(
      baseInput({
        headline: "Most Assists",
        statValue: "42.5 AST",
        statLabel: "Top 12% Today",
      }),
    );

    expect(stat).toEqual({
      custom: true,
      value: "42.5 AST",
      label: "Top 12% Today",
    });
  });

  it("builds share text from custom Daily header fields", () => {
    expect(
      buildLineupShareCardText(
        baseInput({
          headline: "Most Assists",
          statValue: "42.5 AST",
          statLabel: "Top 12% Today",
        }),
      ),
    ).toBe("Most Assists • 42.5 AST · Top 12% Today");
  });
});
