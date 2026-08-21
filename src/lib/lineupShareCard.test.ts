import { describe, expect, it, vi } from "vitest";
import { assignLineupSlots } from "./lineupOrder";
import {
  buildLineupShareCardText,
  drawBrandMarkStamp,
  formatShareCardPlayerMeta,
  resolveShareCardStatDisplay,
  resolveShareCardTitle,
  resolveShareCardUsername,
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

  it("formats linked usernames for the share card", () => {
    expect(resolveShareCardUsername(baseInput())).toBeNull();
    expect(
      resolveShareCardUsername(baseInput({ username: "BallAcademy" })),
    ).toBe("@ballacademy");
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

  it("includes username in share text when present", () => {
    expect(
      buildLineupShareCardText(
        baseInput({
          username: "ace",
          ovr: 91,
        }),
      ),
    ).toBe("Midnight Foxes (@ace) • OVR 91");
  });
});

const sharePlayer = (
  name: string,
  position: Player["position"],
  options: { positions?: Player["positions"]; heightInches?: number } = {},
): Player => ({
  id: name,
  name,
  team: "LAL",
  position,
  positions: options.positions ?? [position],
  jerseyNumber: 23,
  points: 20,
  rebounds: 5,
  assists: 3,
  steals: 1,
  blocks: 1,
  turnovers: 2,
  trueShooting: 0.58,
  threePoint: 0.35,
  threePointersAttempted: 6,
  fieldGoalsAttempted: 14,
  freeThrowsAttempted: 3,
  freeThrowPct: 0.75,
  personalFouls: 2,
  minutes: 32,
  heightInches: options.heightInches ?? 78,
  usage: 25,
  defense: 7,
  gamesPlayed: 70,
  styles: ["connector"],
});

describe("lineupShareCard player rows", () => {
  it("labels unique PG–C slots instead of repeating listed primaries", () => {
    const lineup = [
      sharePlayer("Shorter Point", "PG", { heightInches: 73 }),
      sharePlayer("Taller Point", "PG", { heightInches: 76 }),
      sharePlayer("Wing", "SF"),
      sharePlayer("Power", "PF"),
      sharePlayer("Big", "C"),
    ];

    const rows = assignLineupSlots(lineup).map((entry, index) =>
      formatShareCardPlayerMeta(entry.player, entry.slot, index),
    );

    expect(rows).toEqual([
      "PG · LAL · #23",
      "SG · LAL · #23",
      "SF · LAL · #23",
      "PF · LAL · #23",
      "C · LAL · #23",
    ]);
  });
});

describe("drawBrandMarkStamp", () => {
  it("draws a boxed stamp then the mark image", () => {
    const calls: string[] = [];
    const context = {
      save: () => calls.push("save"),
      restore: () => calls.push("restore"),
      beginPath: () => undefined,
      moveTo: () => undefined,
      lineTo: () => undefined,
      quadraticCurveTo: () => undefined,
      closePath: () => undefined,
      fill: () => calls.push("fill"),
      stroke: () => calls.push("stroke"),
      drawImage: () => calls.push("drawImage"),
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 0,
    } as unknown as CanvasRenderingContext2D;

    const brandMark = {
      naturalWidth: 90,
      naturalHeight: 40,
    } as HTMLImageElement;

    drawBrandMarkStamp(context, brandMark, {
      right: 400,
      bottom: 200,
      markHeight: 20,
    });

    expect(calls).toEqual(["save", "fill", "stroke", "drawImage", "restore"]);
    expect(context.fillStyle).toBe("#0b0d11");
    expect(context.strokeStyle).toBe("rgba(168, 85, 247, 0.55)");
  });
});
