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
  HL_BA_SIZE,
  HL_HEADLINE_MIN,
  HL_HEADLINE_SIZE,
  HL_LOGO_SIZE,
  HL_SPLIT_X,
  chevronClipPolygon,
  collidingHeadlineBoxes,
  fitHeadlineType,
  headlinePanelHex,
  headlineSplitLayout,
  headlineVisibleTypeBoxes,
  parseHeadlineWatermark,
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
  it("keeps a 4:5 photo | team-panel split with a BREAKING kicker", () => {
    expect(GRAPHIC_WIDTH).toBe(1200);
    expect(GRAPHIC_HEIGHT).toBe(1500);
    expect(GRAPHIC_ASPECT).toBeCloseTo(0.8);
    expect(EXPORT_WIDTH).toBe(2400);
    expect(EXPORT_HEIGHT).toBe(3000);
    expect(HL_SPLIT_X).toBeGreaterThan(GRAPHIC_WIDTH * 0.48);
    expect(HL_SPLIT_X).toBeLessThan(GRAPHIC_WIDTH * 0.62);
    expect(HL_LOGO_SIZE).toBeGreaterThan(500);
    expect(HL_HEADLINE_SIZE).toBeGreaterThan(40);
    expect(HL_BA_SIZE).toBeLessThan(80);
    expect(chevronClipPolygon()).toMatch(/^0% 50%/);
    expect(plateInkHex("#ffffff")).toBe("#111111");
    expect(plateInkHex("#0c2340")).toBe("#ffffff");
    expect(headlinePanelHex("MIN")).toBe("#0C2340");
    expect(headlinePanelHex(null)).toMatch(/^#/);
    const draft = defaultHeadlineDraft();
    expect(draft.headline).toBe("BREAKING");
    expect(draft.headline).toBe(DEFAULT_HEADLINE);
    expect(draft.body).toBe("");
    expect(draft.photoSrc).toBeNull();
    expect(draft.showBa).toBe(true);
    expect(draft.subjectMode).toBe("player");
    expect(headlineLabel("  breaking ")).toBe("BREAKING");
    expect(clipHeadlineBody("x".repeat(HEADLINE_BODY_MAX + 12))).toHaveLength(
      HEADLINE_BODY_MAX,
    );
  });

  it("includes story presets on the chevron, not a rotated city/nick clash", () => {
    expect(HEADLINE_TITLE_PRESETS[0]).toBe("BREAKING");
    expect(HEADLINE_TITLE_PRESETS).toContain("BLOWN OUT");
    expect(HEADLINE_TITLE_PRESETS).toContain("CAREER NIGHT");
    expect(HEADLINE_TITLE_PRESETS).toContain("DEFENSIVE CLINIC");
    expect(HEADLINE_TITLE_PRESETS).toContain("OUT");
    expect(HEADLINE_TITLE_PRESETS).toContain("QUESTIONABLE");
    expect(HEADLINE_TITLE_PRESETS).toContain("STATEMENT WIN");
    expect(parseHeadlineWatermark(undefined)).toBe("faint");
    expect(headlineCaptionFor("BREAKING", "")).toContain("Breaking.");
    expect(headlineCaptionFor("CAREER NIGHT", "42 PTS")).toContain("Career night.");
    expect(
      headlineCaptionFor("BREAKING", "AFTER BEATING OKC", "Rudy Gobert"),
    ).toContain("Rudy Gobert");
  });

  it("ships transaction kickers that fit the chevron and keep the player", () => {
    const plates = [
      "TRADE RUMOR",
      "TRADE",
      "SIGNING",
      "WAIVED",
      "BOUGHT OUT",
      "EXTENSION",
      "RE-SIGNED",
    ];
    for (const plate of plates) {
      expect(HEADLINE_TITLE_PRESETS).toContain(plate);
      const fit = fitHeadlineType(plate);
      expect(fit.lines).toEqual([plate]);
      expect(fit.size).toBeGreaterThanOrEqual(HL_HEADLINE_MIN);
    }
    expect(headlineCaptionFor("TRADE RUMOR", "")).toContain("Trade rumor.");
    const gobert = getPlayer("3032976")!;
    const picked = fillHeadlineFromPlayer(gobert, defaultHeadlineDraft());
    const miami = setHeadlineTeamId(picked, "MIA");
    const rumored = { ...miami, headline: "TRADE RUMOR" };
    expect(rumored.playerId).toBe(picked.playerId);
    expect(rumored.photoSrc).toBe(picked.photoSrc);
    expect(rumored.teamId).toBe("MIA");
    expect(rumored.firstName).toBe(picked.firstName);
  });

  it("fits a short kicker on one line and wraps a long take", () => {
    const short = fitHeadlineType("BREAKING");
    expect(short.lines).toEqual(["BREAKING"]);
    expect(short.size).toBe(HL_HEADLINE_SIZE);
    const long = fitHeadlineType("THIS HEADLINE IS A SERIOUSLY LONG TAKE");
    expect(long.lines.length).toBe(2);
    expect(long.size).toBeGreaterThanOrEqual(HL_HEADLINE_MIN);
  });

  it("picks a player for the team panel and fills the official headshot", () => {
    const luka = getPlayer("3945274")!;
    const next = fillHeadlineFromPlayer(luka, defaultHeadlineDraft());
    expect(next.playerId).toBe(luka.id);
    expect(next.teamId).toBeTruthy();
    expect(next.photoSrc).toBe(luka.headshotUrl);
    expect(next.customPhoto).toBe(false);
    expect(next.subjectMode).toBe("player");
  });

  it("locks Gobert to Minnesota on pick, then keeps him when Team is overridden", () => {
    const gobert = getPlayer("3032976")!;
    expect(gobert.team).toBe("MIN");
    const fromBlazers = fillHeadlineFromPlayer(gobert, {
      ...defaultHeadlineDraft(),
      teamId: "POR",
    });
    expect(fromBlazers.teamId).toBe("MIN");
    expect(fromBlazers.playerId).toBe(gobert.id);
    expect(splitTeamWordmark(getTeam(fromBlazers.teamId))).toEqual({
      city: "MINNESOTA",
      nick: "TIMBERWOLVES",
    });
    const switched = setHeadlineTeamId(fromBlazers, "POR");
    expect(switched.playerId).toBe(gobert.id);
    expect(switched.firstName).toBe(fromBlazers.firstName);
    expect(switched.lastName).toBe(fromBlazers.lastName);
    expect(switched.photoSrc).toBe(fromBlazers.photoSrc);
    expect(switched.teamId).toBe("POR");
  });

  it("lets LeBron stay LeBron when Team is set to Miami", () => {
    const lebron = getPlayer("1966")!;
    const picked = fillHeadlineFromPlayer(lebron, defaultHeadlineDraft());
    expect(picked.teamId).toBe(getTeam(lebron.team)?.id ?? lebron.team);
    expect(picked.firstName).toBe("LeBron");
    const heat = setHeadlineTeamId(picked, "MIA");
    expect(heat.playerId).toBe(lebron.id);
    expect(heat.teamId).toBe("MIA");
    expect(heat.firstName).toBe("LeBron");
    expect(heat.lastName).toBe(picked.lastName);
    expect(heat.photoSrc).toBe(picked.photoSrc);
  });

  it("can skip the player and lock up a team only", () => {
    const next = fillHeadlineFromTeam("SAS", defaultHeadlineDraft());
    expect(next.teamId).toBe("SAS");
    expect(next.playerId).toBeNull();
    expect(next.firstName).toBe("");
    expect(next.subjectMode).toBe("team");
  });

  it("splits photo left of a huge-logo panel with no overlapping type", () => {
    const layout = headlineSplitLayout({
      headline: "BREAKING",
      body: "AFTER BEATING OKC 111–109\nLAST NIGHT, THE SPURS\nHAVE A RECORD OF 1–0",
      firstName: "Victor",
      lastName: "Wembanyama",
      city: "SAN ANTONIO",
      nick: "SPURS",
    });
    expect(layout.photo.x).toBe(0);
    expect(layout.photo.w).toBe(layout.splitX);
    expect(layout.panel.x).toBe(layout.splitX);
    expect(layout.photo.w + layout.panel.w).toBe(GRAPHIC_WIDTH);
    expect(layout.chevron.x).toBeLessThan(layout.splitX);
    expect(layout.chevron.x + layout.chevron.w).toBe(GRAPHIC_WIDTH);
    expect(layout.logo.size).toBeGreaterThan(500);
    expect(layout.logo.x + layout.logo.size / 2).toBeCloseTo(
      layout.panel.x + layout.panel.w / 2,
      0,
    );
    expect(layout.given.text).toBe("VICTOR");
    expect(layout.family.text).toBe("WEMBANYAMA");
    expect(layout.given.y).toBeGreaterThan(layout.chevron.y + layout.chevron.h);
    expect(layout.family.y).toBeGreaterThanOrEqual(layout.given.y + layout.given.h);
    expect(layout.body.y).toBeGreaterThanOrEqual(layout.family.y + layout.family.h);
    expect(layout.ba.x + layout.ba.w).toBeLessThan(layout.splitX);
    expect(
      collidingHeadlineBoxes(headlineVisibleTypeBoxes(layout)),
    ).toEqual([]);

    const sixers = splitTeamWordmark(getTeam("PHI")!);
    expect(sixers).toEqual({ city: "PHILADELPHIA", nick: "76ERS" });
    const phi = headlineSplitLayout({
      headline: "BLOWN OUT",
      body: "WILL NOT PLAY TONIGHT",
      firstName: "Joel",
      lastName: "Embiid",
      city: sixers.city,
      nick: sixers.nick,
    });
    expect(phi.splitX).toBe(layout.splitX);
    expect(phi.given.text).toBe("JOEL");
    expect(phi.family.text).toBe("EMBIID");
    expect(collidingHeadlineBoxes(headlineVisibleTypeBoxes(phi))).toEqual([]);

    const story = headlineSplitLayout({
      headline: "BREAKING",
      body: "AFTER BEATING OKC 111–109",
      firstName: "Joel",
      lastName: "Embiid",
      city: "PHILADELPHIA",
      nick: "76ERS",
      boardH: STORY_DESIGN_HEIGHT,
    });
    expect(STORY_DESIGN_HEIGHT).toBe(2133);
    expect(story.splitX).toBe(layout.splitX);
    expect(story.photo.h).toBe(STORY_DESIGN_HEIGHT);
    expect(story.panel.h).toBe(STORY_DESIGN_HEIGHT);
    expect(story.boardH).toBeGreaterThan(layout.boardH);
    expect(collidingHeadlineBoxes(headlineVisibleTypeBoxes(story))).toEqual([]);

    const teamOnly = headlineSplitLayout({
      headline: "CAREER NIGHT",
      city: "MINNESOTA",
      nick: "TIMBERWOLVES",
    });
    expect(teamOnly.given.text).toBe("MINNESOTA");
    expect(teamOnly.family.text).toBe("TIMBERWOLVES");
    expect(
      collidingHeadlineBoxes(headlineVisibleTypeBoxes(teamOnly)),
    ).toEqual([]);
  });

  it("auto-fills last night as stacked body lines with an en dash", () => {
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
