import { describe, expect, it } from "vitest";
import { HEADLINE_TITLE_PRESETS } from "../instagramComposer/composerPresets";
import { EXPORT_HEIGHT, EXPORT_WIDTH } from "../standingsComposer/rankingState";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import { getTeam } from "../standingsComposer/teams";
import {
  GRAPHIC_ASPECT,
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  HL_FACE_SAFE,
  HL_HEADLINE_SIZE,
  HL_PLATE_FILL,
  HL_TORN_POINTS,
  headlineTypeStack,
  headlineWatermarkBox,
  parseHeadlineWatermark,
} from "./headlineLayout";
import {
  clipHeadlineBody,
  DEFAULT_HEADLINE,
  defaultHeadlineDraft,
  fillHeadlineFromPlayer,
  formatHeadlineBody,
  formatHeadlineBodyLines,
  HEADLINE_BODY_MAX,
  headlineBodyLines,
  headlineLabel,
  splitTeamWordmark,
} from "./headlineState";

const lastNight = {
  eventId: "1",
  gameDate: "2026-10-13",
  teamId: "SAS",
  opponentId: "OKC",
  opponentAbbrev: "OKC",
  result: "W" as const,
  playerScore: "111",
  opponentScore: "109",
  resultLine: "111-109 W VS OKC",
  dateLabel: "10/13",
  stats: {
    pts: "0",
    reb: "0",
    ast: "0",
    stl: "0",
    blk: "0",
    fg: "0-0",
    three: "0-0",
    tov: "0",
    min: "0",
  },
};

describe("headline composer", () => {
  it("keeps a 4:5 full-bleed photo board with a torn black plate", () => {
    expect(GRAPHIC_WIDTH).toBe(1200);
    expect(GRAPHIC_HEIGHT).toBe(1500);
    expect(GRAPHIC_ASPECT).toBeCloseTo(0.8);
    expect(EXPORT_WIDTH).toBe(2400);
    expect(EXPORT_HEIGHT).toBe(3000);
    expect(HL_HEADLINE_SIZE).toBeGreaterThan(48);
    expect(HL_PLATE_FILL).toBe("#0c0c0c");
    expect(HL_TORN_POINTS.length).toBeGreaterThan(12);
    const draft = defaultHeadlineDraft();
    expect(draft.headline).toBe(DEFAULT_HEADLINE);
    expect(draft.body).toBe("");
    expect(draft.photoSrc).toBeNull();
    expect(draft.showBa).toBe(true);
    expect(draft.watermark).toBe("behind");
    expect(headlineLabel("  massive leap ")).toBe("MASSIVE LEAP");
    expect(clipHeadlineBody("x".repeat(HEADLINE_BODY_MAX + 12))).toHaveLength(
      HEADLINE_BODY_MAX,
    );
  });

  it("includes punchy headline presets plus a custom box", () => {
    expect(HEADLINE_TITLE_PRESETS).toContain("MASSIVE LEAP");
    expect(HEADLINE_TITLE_PRESETS).toContain("STATEMENT WIN");
    expect(HEADLINE_TITLE_PRESETS).toContain("HE’S HIM");
    expect(parseHeadlineWatermark(undefined)).toBe("behind");
    expect(parseHeadlineWatermark("off")).toBe("off");
    expect(parseHeadlineWatermark("small")).toBe("small");
  });

  it("picks a player for the team wordmark without a mugshot", () => {
    const luka = getPlayer("3945274")!;
    const next = fillHeadlineFromPlayer(luka, defaultHeadlineDraft());
    expect(next.playerId).toBe(luka.id);
    expect(next.teamId).toBeTruthy();
    expect(next.photoSrc).toBeNull();
    expect(next.customPhoto).toBe(false);
  });

  it("runs the wordmark through the plate and parks the logo off the face", () => {
    const spurs = getTeam("SAS")!;
    expect(splitTeamWordmark(spurs)).toEqual({
      city: "SAN ANTONIO",
      nick: "SPURS",
    });
    const stack = headlineTypeStack(2, true);
    expect(stack.cityBottom).toBeGreaterThan(stack.plateTop);
    expect(stack.nickTop).toBeLessThan(stack.plateBottom);
    expect(stack.cityTop).toBeLessThan(stack.plateTop);
    expect(stack.nickBottom).toBeGreaterThan(stack.plateBottom);
    const behind = headlineWatermarkBox("behind", stack);
    expect(behind.y).toBeGreaterThan(HL_FACE_SAFE - 80);
    expect(behind.y + behind.size).toBeGreaterThan(stack.plateTop);
    const small = headlineWatermarkBox("small", stack);
    expect(small.size).toBeLessThan(200);
    expect(small.y).toBeGreaterThan(GRAPHIC_HEIGHT * 0.7);
  });

  it("auto-fills last night as two short lines", () => {
    const spurs = getTeam("SAS")!;
    expect(formatHeadlineBodyLines(spurs, lastNight, { wins: 18, losses: 7 })).toEqual([
      "BEATS OKC 111-109",
      "SPURS NOW 18-7",
    ]);
    expect(formatHeadlineBody(spurs, lastNight, { wins: 18, losses: 7 })).toBe(
      "BEATS OKC 111-109\nSPURS NOW 18-7",
    );
    expect(headlineBodyLines("BEATS OKC 111-109\nSPURS NOW 18-7")).toEqual([
      "BEATS OKC 111-109",
      "SPURS NOW 18-7",
    ]);
  });
});
