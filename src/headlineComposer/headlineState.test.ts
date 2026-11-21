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
  applyHeadlineNameScope,
  applyHeadlineSubject,
  clipHeadlineBody,
  DEFAULT_HEADLINE,
  defaultHeadlineDraft,
  fillHeadlineFromPlayer,
  fillHeadlineFromTeam,
  formatHeadlineBody,
  formatHeadlineBodyLines,
  formatHeadlineMeta,
  HEADLINE_BODY_MAX,
  headlineBodyLines,
  headlineCaptionFor,
  headlineLabel,
  normalizeHeadlineDraft,
  pickHeadlineTeamOverlay,
  setHeadlineTeamId,
  splitTeamWordmark,
  TEAM_SHORT_LOCKUP,
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
    expect(HEADLINE_TITLE_PRESETS).toContain("DOUBTFUL");
    expect(HEADLINE_TITLE_PRESETS).toContain("QUESTIONABLE");
    expect(HEADLINE_TITLE_PRESETS).toContain("REST");
    expect(HEADLINE_TITLE_PRESETS).toContain("GTD");
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
    expect(next.firstName).toBe("San Antonio");
    expect(next.lastName).toBe("Spurs");
    expect(next.subjectMode).toBe("team");
    expect(next.nameScope).toBe("auto");
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
    const wolves = getTeam("MIN")!;
    const edwardsNight = {
      ...lastNight,
      teamId: "MIN",
      opponentId: "MIA",
      opponentAbbrev: "MIA",
      result: "L" as const,
      playerScore: "131",
      opponentScore: "106",
      home: false,
      resultLine: "131-106 W @ MIA",
    };
    expect(formatHeadlineBodyLines(wolves, edwardsNight, { wins: 1, losses: 0 })[0]).toBe(
      "AFTER BEATING MIA 131–106",
    );
    expect(formatHeadlineMeta({ wins: 1, losses: 0 }, "2026-10-21", edwardsNight)).toMatch(
      /W 131–106/,
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

  it("auto-picks Wolves so Timberwolves stays inside the panel", () => {
    const wolves = getTeam("MIN")!;
    expect(splitTeamWordmark(wolves)).toEqual({
      city: "MINNESOTA",
      nick: "TIMBERWOLVES",
    });
    expect(TEAM_SHORT_LOCKUP.MIN).toBe("Wolves");
    expect(pickHeadlineTeamOverlay(wolves, "city")).toEqual({
      firstName: "Minnesota",
      lastName: "",
    });
    expect(pickHeadlineTeamOverlay(wolves, "nick")).toEqual({
      firstName: "Minnesota",
      lastName: "Timberwolves",
    });
    expect(pickHeadlineTeamOverlay(wolves, "short")).toEqual({
      firstName: "Minnesota",
      lastName: "Wolves",
    });
    expect(pickHeadlineTeamOverlay(wolves, "auto")).toEqual({
      firstName: "Minnesota",
      lastName: "Wolves",
    });
    const auto = headlineSplitLayout({
      headline: "BREAKING",
      firstName: "Minnesota",
      lastName: "Wolves",
      city: "MINNESOTA",
      nick: "TIMBERWOLVES",
      shortName: "Wolves",
    });
    expect(auto.family.text).toBe("WOLVES");
    expect(auto.family.x + auto.family.w).toBeLessThanOrEqual(GRAPHIC_WIDTH);
    expect(auto.given.x + auto.given.w).toBeLessThanOrEqual(GRAPHIC_WIDTH);
    expect(auto.family.size).toBeGreaterThanOrEqual(58);
    const nick = headlineSplitLayout({
      headline: "BREAKING",
      firstName: "Minnesota",
      lastName: "Timberwolves",
      city: "MINNESOTA",
      nick: "TIMBERWOLVES",
      shortName: "Wolves",
    });
    expect(nick.family.lines.every((line) => line.length > 0)).toBe(true);
    expect(nick.family.x + nick.family.w).toBeLessThanOrEqual(GRAPHIC_WIDTH);
    expect(nick.family.size).toBeGreaterThanOrEqual(14);
    const story = headlineSplitLayout({
      headline: "BREAKING",
      firstName: "Minnesota",
      lastName: "Wolves",
      city: "MINNESOTA",
      nick: "TIMBERWOLVES",
      shortName: "Wolves",
      boardH: STORY_DESIGN_HEIGHT,
    });
    expect(story.family.text).toBe("WOLVES");
    expect(collidingHeadlineBoxes(headlineVisibleTypeBoxes(story))).toEqual([]);
  });

  it("keeps stacked type editable when Team only changes the logo", () => {
    const gobert = getPlayer("3032976")!;
    const picked = fillHeadlineFromPlayer(gobert, defaultHeadlineDraft());
    const heat = setHeadlineTeamId(picked, "MIA");
    expect(heat.teamId).toBe("MIA");
    expect(heat.firstName).toBe("Rudy");
    expect(heat.lastName).toBe(picked.lastName);
    expect(heat.photoSrc).toBe(picked.photoSrc);
    const typed = { ...heat, firstName: "Minnesota", lastName: "Wolves" };
    const stillHeat = setHeadlineTeamId(typed, "MIA");
    expect(stillHeat.firstName).toBe("Minnesota");
    expect(stillHeat.lastName).toBe("Wolves");
    const scoped = applyHeadlineNameScope(stillHeat, "short");
    expect(scoped.teamId).toBe("MIA");
    expect(scoped.playerId).toBe(picked.playerId);
    expect(scoped.firstName).toBe("Miami");
    expect(scoped.lastName).toBe("Heat");
    const subject = applyHeadlineSubject(picked, "team");
    expect(subject.nameScope).toBe("auto");
    expect(subject.subjectMode).toBe("team");
    expect(subject.playerId).toBe(picked.playerId);
    expect(subject.photoSrc).toBe(picked.photoSrc);
  });

  it("mirrors, trades, and drops the photo for franchise news", () => {
    const split = headlineSplitLayout({
      headline: "BREAKING",
      firstName: "Jalen",
      lastName: "Hurts",
    });
    const mirror = headlineSplitLayout({
      headline: "BREAKING",
      firstName: "Jalen",
      lastName: "Hurts",
      panelLeft: true,
    });
    expect(mirror.panelLeft).toBe(true);
    expect(mirror.panel.x).toBe(0);
    expect(mirror.photo.x).toBe(mirror.panel.w);
    expect(mirror.photo.w + mirror.panel.w).toBe(GRAPHIC_WIDTH);
    expect(mirror.chevron.mirror).toBe(true);
    expect(split.panelLeft).toBe(false);
    expect(split.given.size).toBeLessThan(split.family.size);

    const even = headlineSplitLayout({
      headline: "BREAKING",
      firstName: "Jalen",
      lastName: "Hurts",
      nameStack: "even",
    });
    expect(even.given.size).toBe(even.family.size);

    const trade = headlineSplitLayout({
      headline: "TRADE",
      firstName: "Rudy",
      lastName: "Gobert",
      boardMode: "trade",
    });
    expect(trade.boardMode).toBe("trade");
    expect(trade.photo.w).toBeGreaterThan(0);
    expect(trade.panel.w).toBe(trade.panelB.w);
    expect(trade.panel.w + trade.panelB.w).toBe(trade.photo.w > 0 ? GRAPHIC_WIDTH - trade.photo.w : GRAPHIC_WIDTH);
    expect(trade.logoB.size).toBeGreaterThan(0);

    const franchise = headlineSplitLayout({
      headline: "HIRED",
      firstName: "Minnesota",
      lastName: "Wolves",
      boardMode: "team-only",
    });
    expect(franchise.photo.w).toBe(0);
    expect(franchise.panel.x).toBe(0);
    expect(franchise.panel.w).toBe(GRAPHIC_WIDTH);
    expect(franchise.given.x).toBeGreaterThan(HL_SPLIT_X);
    expect(franchise.logo.size).toBeGreaterThan(400);
    expect(collidingHeadlineBoxes(headlineVisibleTypeBoxes(franchise))).toEqual(
      [],
    );
  });

  it("keeps a second story line, record, and source off the name", () => {
    const layout = headlineSplitLayout({
      headline: "OUT",
      firstName: "Anthony",
      lastName: "Edwards",
      storyLine: "KNEE",
      metaLine: "2–1 · OCT 14",
      sourceCredit: "Shams",
      body: "WILL NOT PLAY TONIGHT",
    });
    expect(layout.story.text).toBe("KNEE");
    expect(layout.story.y).toBeGreaterThan(layout.chevron.y + layout.chevron.h);
    expect(layout.given.y).toBeGreaterThanOrEqual(layout.story.y + layout.story.h);
    expect(layout.family.y).toBeGreaterThanOrEqual(layout.given.y + layout.given.h);
    expect(layout.meta.y).toBeGreaterThanOrEqual(layout.family.y + layout.family.h);
    expect(layout.body.y).toBeGreaterThanOrEqual(layout.meta.y + layout.meta.h);
    expect(layout.source.text).toBe("SHAMS");
    expect(collidingHeadlineBoxes(headlineVisibleTypeBoxes(layout))).toEqual([]);
    expect(formatHeadlineMeta({ wins: 2, losses: 1 }, "2026-10-14", lastNight)).toMatch(
      /2–1/,
    );
    const draft = defaultHeadlineDraft();
    expect(draft.sourceCredit).toBe("");
    expect(draft.showMeta).toBe(false);
    expect(draft.photoBw).toBe(false);
    expect(draft.panelLeft).toBe(false);
    expect(draft.boardMode).toBe("split");
    expect(draft.nameStack).toBe("hurts");
    expect(draft.showLetterGrade).toBe(false);
  });

  it("places an optional letter-grade stamp under the stacked name", () => {
    const off = headlineSplitLayout({
      headline: "SIGNING",
      firstName: "Jaylen",
      lastName: "Brown",
      storyLine: "FOUR YEARS",
    });
    expect(off.grade.h).toBe(0);
    expect(collidingHeadlineBoxes(headlineVisibleTypeBoxes(off))).toEqual([]);
    const on = headlineSplitLayout({
      headline: "SIGNING",
      firstName: "Jaylen",
      lastName: "Brown",
      storyLine: "FOUR YEARS",
      showLetterGrade: true,
      letterGradeReason: "4yr / $192M",
    });
    expect(on.grade.h).toBeGreaterThan(80);
    expect(on.grade.y).toBeGreaterThanOrEqual(on.family.y + on.family.h);
    expect(on.grade.x + on.grade.w).toBeLessThanOrEqual(GRAPHIC_WIDTH);
    expect(on.body.y).toBeGreaterThanOrEqual(on.grade.y + on.grade.h);
    expect(collidingHeadlineBoxes(headlineVisibleTypeBoxes(on))).toEqual([]);
    const wolves = headlineSplitLayout({
      headline: "SIGNING",
      firstName: "Minnesota",
      lastName: "Timberwolves",
      city: "MINNESOTA",
      nick: "TIMBERWOLVES",
      shortName: "Wolves",
      showLetterGrade: true,
      letterGradeReason: "OVERPAY",
    });
    expect(wolves.family.x + wolves.family.w).toBeLessThanOrEqual(GRAPHIC_WIDTH);
    expect(wolves.grade.x + wolves.grade.w).toBeLessThanOrEqual(GRAPHIC_WIDTH);
    expect(collidingHeadlineBoxes(headlineVisibleTypeBoxes(wolves))).toEqual([]);
    const story = headlineSplitLayout({
      headline: "SIGNING",
      firstName: "Jaylen",
      lastName: "Brown",
      showLetterGrade: true,
      letterGradeReason: "4YR / $192M",
      boardH: STORY_DESIGN_HEIGHT,
    });
    expect(story.grade.h).toBeGreaterThan(0);
    expect(collidingHeadlineBoxes(headlineVisibleTypeBoxes(story))).toEqual([]);
  });
});
