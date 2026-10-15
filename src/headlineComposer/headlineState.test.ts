import { describe, expect, it } from "vitest";
import { HEADLINE_TITLE_PRESETS } from "../instagramComposer/composerPresets";
import { EXPORT_HEIGHT, EXPORT_WIDTH } from "../standingsComposer/rankingState";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import { getTeam } from "../standingsComposer/teams";
import {
  GRAPHIC_ASPECT,
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  HL_FADE_H,
  HL_FACE_SAFE,
  HL_HEADLINE_MIN,
  HL_HEADLINE_SIZE,
  HL_PLATE_FILL,
  fitHeadlineType,
  headlineDateKicker,
  headlinePlateHeight,
  headlineTypeStack,
  headlineWatermarkBox,
  parseHeadlineWatermark,
  plateClipPolygon,
  plateFillHex,
  plateInkHex,
} from "./headlineLayout";
import {
  clipHeadlineBody,
  DEFAULT_HEADLINE,
  defaultHeadlineDraft,
  fillHeadlineFromPlayer,
  fillHeadlineFromTeam,
  formatHeadlineBody,
  formatHeadlineBodyLines,
  HEADLINE_BODY_MAX,
  headlineBodyLines,
  headlineCaptionFor,
  headlineLabel,
  normalizeHeadlineDraft,
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
  it("keeps a 4:5 full-bleed photo board with a clean white plate", () => {
    expect(GRAPHIC_WIDTH).toBe(1200);
    expect(GRAPHIC_HEIGHT).toBe(1500);
    expect(GRAPHIC_ASPECT).toBeCloseTo(0.8);
    expect(EXPORT_WIDTH).toBe(2400);
    expect(EXPORT_HEIGHT).toBe(3000);
    expect(HL_HEADLINE_SIZE).toBeGreaterThan(48);
    expect(HL_PLATE_FILL).toBe("#ffffff");
    expect(HL_FADE_H).toBe(500);
    expect(plateClipPolygon()).toMatch(/^\d/);
    expect(plateClipPolygon()).not.toContain("polygon");
    expect(plateFillHex("white")).toBe("#ffffff");
    expect(plateInkHex("#ffffff")).toBe("#111111");
    expect(plateInkHex("#0c0c0c")).toBe("#ffffff");
    const draft = defaultHeadlineDraft();
    expect(draft.headline).toBe(DEFAULT_HEADLINE);
    expect(draft.body).toBe("");
    expect(draft.photoSrc).toBeNull();
    expect(draft.showBa).toBe(true);
    expect(draft.watermark).toBe("faint");
    expect(draft.plateColor).toBe("white");
    expect(draft.lockup).toBe("bottom");
    expect(draft.namePlacement).toBe("off");
    expect(draft.showOpponentMark).toBe(false);
    expect(draft.kickerMode).toBe("off");
    expect(draft.subjectMode).toBe("player");
    expect(headlineLabel("  massive leap ")).toBe("MASSIVE LEAP");
    expect(clipHeadlineBody("x".repeat(HEADLINE_BODY_MAX + 12))).toHaveLength(
      HEADLINE_BODY_MAX,
    );
  });

  it("includes punchy headline presets plus caption lines", () => {
    expect(HEADLINE_TITLE_PRESETS).toContain("MASSIVE LEAP");
    expect(HEADLINE_TITLE_PRESETS).toContain("STATEMENT WIN");
    expect(HEADLINE_TITLE_PRESETS).toContain("HE’S HIM");
    expect(parseHeadlineWatermark(undefined)).toBe("faint");
    expect(parseHeadlineWatermark("off")).toBe("off");
    expect(parseHeadlineWatermark("behind")).toBe("faint");
    expect(parseHeadlineWatermark("small")).toBe("medium");
    expect(headlineCaptionFor("MASSIVE LEAP", "")).toContain("The leap is real.");
    expect(headlineCaptionFor("HOT TAKE", "BEATS OKC")).toContain("Hot take.");
  });

  it("wraps a long take onto two lines and shrinks before overflow", () => {
    const short = fitHeadlineType("MASSIVE LEAP");
    expect(short.lines).toEqual(["MASSIVE LEAP"]);
    expect(short.size).toBe(HL_HEADLINE_SIZE);
    const long = fitHeadlineType("THIS HEADLINE IS A SERIOUSLY LONG TAKE");
    expect(long.lines.length).toBe(2);
    expect(long.size).toBeGreaterThanOrEqual(HL_HEADLINE_MIN);
    expect(headlinePlateHeight(long)).toBeGreaterThan(headlinePlateHeight(short));
  });

  it("picks a player for the team wordmark without a mugshot", () => {
    const luka = getPlayer("3945274")!;
    const next = fillHeadlineFromPlayer(luka, defaultHeadlineDraft());
    expect(next.playerId).toBe(luka.id);
    expect(next.teamId).toBeTruthy();
    expect(next.photoSrc).toBeNull();
    expect(next.customPhoto).toBe(false);
    expect(next.subjectMode).toBe("player");
  });

  it("can skip the player and lock up a team only", () => {
    const next = fillHeadlineFromTeam("SAS", defaultHeadlineDraft());
    expect(next.teamId).toBe("SAS");
    expect(next.playerId).toBeNull();
    expect(next.firstName).toBe("");
    expect(next.subjectMode).toBe("team");
  });

  it("runs the wordmark through the plate and parks the logo off the face", () => {
    const spurs = getTeam("SAS")!;
    expect(splitTeamWordmark(spurs)).toEqual({
      city: "SAN ANTONIO",
      nick: "SPURS",
    });
    const stack = headlineTypeStack({ bodyLines: 2, plateH: 118 });
    expect(stack.cityBottom).toBeGreaterThan(stack.plateTop);
    expect(stack.nickTop).toBeLessThan(stack.plateBottom);
    expect(stack.cityTop).toBeLessThan(stack.plateTop);
    expect(stack.nickBottom).toBeGreaterThan(stack.plateBottom);
    expect(stack.fadeAt).toBe("bottom");
    expect(stack.bodyTop).toBeGreaterThan(stack.nickBottom);
    const faint = headlineWatermarkBox("faint", stack);
    expect(faint.opacity).toBeLessThan(0.2);
    expect(faint.y).toBeGreaterThan(HL_FACE_SAFE - 80);
    const medium = headlineWatermarkBox("medium", stack);
    expect(medium.opacity).toBeGreaterThan(faint.opacity);
    expect(medium.y).toBeGreaterThan(HL_FACE_SAFE - 80);
    const top = headlineTypeStack({
      bodyLines: 2,
      lockup: "top",
      kicker: true,
    });
    expect(top.fadeAt).toBe("top");
    expect(top.plateTop).toBeLessThan(stack.plateTop);
    expect(headlineDateKicker("2026-10-13", "date")).toBe("OCT 13");
    expect(headlineDateKicker(null, "last-night")).toBe("LAST NIGHT");
  });

  it("auto-fills last night as two short lines with an en dash", () => {
    const spurs = getTeam("SAS")!;
    expect(formatHeadlineBodyLines(spurs, lastNight, { wins: 1, losses: 0 })).toEqual([
      "BEATS OKC 111–109",
      "SPURS NOW 1–0",
    ]);
    expect(formatHeadlineBody(spurs, lastNight, { wins: 1, losses: 0 })).toBe(
      "BEATS OKC 111–109\nSPURS NOW 1–0",
    );
    expect(headlineBodyLines("BEATS OKC 111–109\nSPURS NOW 1–0")).toEqual([
      "BEATS OKC 111–109",
      "SPURS NOW 1–0",
    ]);
    expect(normalizeHeadlineDraft(defaultHeadlineDraft()).showOpponentMark).toBe(
      false,
    );
  });
});
