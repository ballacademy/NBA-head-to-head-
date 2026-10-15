import { describe, expect, it } from "vitest";
import { HEADLINE_TITLE_PRESETS } from "../instagramComposer/composerPresets";
import {
  EXPORT_HEIGHT,
  EXPORT_WIDTH,
  STORY_DESIGN_HEIGHT,
} from "../standingsComposer/rankingState";
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
  HL_PLATE_ROTATE,
  collidingHeadlineBoxes,
  fitHeadlineType,
  headlineDateKicker,
  headlinePlateHeight,
  headlineTypeStack,
  headlineVisibleTypeBoxes,
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
  setHeadlineTeamId,
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
    expect(HL_PLATE_ROTATE).toBe(0);
    expect(HL_FADE_H).toBeGreaterThan(480);
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
    expect(
      headlineCaptionFor("MASSIVE LEAP", "AFTER BEATING OKC", "Joel Embiid"),
    ).toContain("Joel Embiid");
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

  it("locks Gobert to Minnesota, never a leftover Trail Blazers wordmark", () => {
    const gobert = getPlayer("3032976")!;
    expect(gobert.team).toBe("MIN");
    const fromBlazers = fillHeadlineFromPlayer(gobert, {
      ...defaultHeadlineDraft(),
      teamId: "POR",
    });
    expect(fromBlazers.teamId).toBe("MIN");
    expect(splitTeamWordmark(getTeam(fromBlazers.teamId))).toEqual({
      city: "MINNESOTA",
      nick: "TIMBERWOLVES",
    });
    const switched = setHeadlineTeamId(fromBlazers, "POR");
    expect(switched.playerId).toBeNull();
    expect(switched.teamId).toBe("POR");
    expect(switched.firstName).toBe("");
  });

  it("can skip the player and lock up a team only", () => {
    const next = fillHeadlineFromTeam("SAS", defaultHeadlineDraft());
    expect(next.teamId).toBe("SAS");
    expect(next.playerId).toBeNull();
    expect(next.firstName).toBe("");
    expect(next.subjectMode).toBe("team");
  });

  it("runs the wordmark through the plate without colliding type boxes", () => {
    const spurs = getTeam("SAS")!;
    expect(splitTeamWordmark(spurs)).toEqual({
      city: "SAN ANTONIO",
      nick: "SPURS",
    });
    const stack = headlineTypeStack({
      bodyLines: 3,
      plateH: 124,
      city: "SAN ANTONIO",
      nick: "SPURS",
    });
    expect(stack.cityBottom).toBeLessThanOrEqual(stack.plateTop + 0.01);
    expect(stack.nickTop).toBeGreaterThanOrEqual(stack.plateBottom - 0.01);
    expect(stack.cityTop).toBeLessThan(stack.plateTop);
    expect(stack.nickBottom).toBeGreaterThan(stack.plateBottom);
    expect(stack.cityTop + stack.citySize * 0.5).toBeLessThanOrEqual(
      stack.plateTop,
    );
    expect(stack.nickBottom - stack.nickSize * 0.5).toBeGreaterThanOrEqual(
      stack.plateBottom,
    );
    const sixers = splitTeamWordmark(getTeam("PHI")!);
    expect(sixers).toEqual({ city: "PHILADELPHIA", nick: "76ERS" });
    const phi = headlineTypeStack({
      bodyLines: 3,
      plateH: 128,
      city: sixers.city,
      nick: sixers.nick,
    });
    expect(phi.cityBottom).toBeLessThanOrEqual(phi.plateTop + 0.01);
    expect(phi.nickTop).toBeGreaterThanOrEqual(phi.plateBottom - 0.01);
    expect(phi.cityTop + phi.citySize * 0.5).toBeLessThanOrEqual(phi.plateTop);
    const story = headlineTypeStack({
      bodyLines: 3,
      plateH: 124,
      city: "PHILADELPHIA",
      nick: "76ERS",
      boardH: STORY_DESIGN_HEIGHT,
    });
    expect(STORY_DESIGN_HEIGHT).toBe(2133);
    expect(story.bodyBottom).toBe(STORY_DESIGN_HEIGHT - 52);
    expect(story.cityTop).toBeGreaterThan(stack.cityTop);
    expect(stack.fadeAt).toBe("bottom");
    expect(stack.bodyTop).toBeGreaterThanOrEqual(stack.nickBottom);
    expect(
      collidingHeadlineBoxes(
        headlineVisibleTypeBoxes(stack, {
          showBa: true,
          hasKicker: false,
          hasBody: true,
        }),
      ),
    ).toEqual([]);
    const portland = headlineTypeStack({
      bodyLines: 3,
      plateH: 124,
      kicker: true,
      city: "PORTLAND",
      nick: "TRAIL BLAZERS",
    });
    expect(
      collidingHeadlineBoxes(
        headlineVisibleTypeBoxes(portland, {
          showBa: true,
          hasKicker: true,
          hasBody: true,
        }),
      ),
    ).toEqual([]);
    expect(portland.kickerBottom).toBeLessThanOrEqual(portland.cityTop);
    const wolves = headlineTypeStack({
      bodyLines: 3,
      plateH: 124,
      kicker: true,
      nameUnder: true,
      city: "MINNESOTA",
      nick: "TIMBERWOLVES",
    });
    expect(
      collidingHeadlineBoxes(
        headlineVisibleTypeBoxes(wolves, {
          showBa: true,
          hasKicker: true,
          hasName: true,
          hasBody: true,
        }),
      ),
    ).toEqual([]);
    const faint = headlineWatermarkBox("faint", stack);
    expect(faint.opacity).toBeLessThan(0.2);
    expect(faint.y).toBeGreaterThan(HL_FACE_SAFE - 80);
    const medium = headlineWatermarkBox("medium", stack);
    expect(medium.opacity).toBeGreaterThan(faint.opacity);
    expect(medium.y).toBeGreaterThan(HL_FACE_SAFE - 80);
    const top = headlineTypeStack({
      bodyLines: 3,
      lockup: "top",
      kicker: true,
      city: "SAN ANTONIO",
      nick: "SPURS",
    });
    expect(top.fadeAt).toBe("top");
    expect(top.plateTop).toBeLessThan(stack.plateTop);
    expect(top.kickerTop).toBeGreaterThan(36 + 72);
    expect(
      collidingHeadlineBoxes(
        headlineVisibleTypeBoxes(top, {
          showBa: true,
          hasKicker: true,
          hasBody: true,
        }),
      ),
    ).toEqual([]);
    expect(headlineDateKicker("2026-10-13", "date")).toBe("OCT 13");
    expect(headlineDateKicker(null, "last-night")).toBe("LAST NIGHT");
  });

  it("auto-fills last night as two short lines with an en dash", () => {
    const spurs = getTeam("SAS")!;
    expect(formatHeadlineBodyLines(spurs, lastNight, { wins: 1, losses: 0 })).toEqual([
      "AFTER BEATING OKC 111–109",
      "LAST NIGHT, THE SPURS",
      "HAVE A RECORD OF 1–0",
    ]);
    expect(formatHeadlineBody(spurs, lastNight, { wins: 1, losses: 0 })).toBe(
      "AFTER BEATING OKC 111–109\nLAST NIGHT, THE SPURS\nHAVE A RECORD OF 1–0",
    );
    expect(
      headlineBodyLines(
        "AFTER LOSING TO IND 103-129 LAST NIGHT, THE TRAIL BLAZERS HAVE A RECORD OF 2-1",
      ).length,
    ).toBeGreaterThan(1);
    expect(headlineBodyLines("BEATS OKC 111–109\nSPURS NOW 1–0")).toEqual([
      "BEATS OKC 111–109",
      "SPURS NOW 1–0",
    ]);
    expect(normalizeHeadlineDraft(defaultHeadlineDraft()).showOpponentMark).toBe(
      false,
    );
  });
});
