import { describe, expect, it } from "vitest";
import { GRAPHIC_HEIGHT } from "../standingsComposer/rankingState";
import {
  emptyPicksGame,
  formatPicksLine,
  isPicksRowEdited,
  mergePicksFill,
  parseEspnAwayLine,
  parsePicksLineInput,
  parsePicksScoreboard,
  picksFillLayout,
  PICKS_SCOREBOARD_URL,
  refillPicksRow,
  setPicksLine,
  setPicksTeam,
  togglePicksPick,
  type PicksGame,
} from "./picksState";

const scoreboard = (
  events: Array<{
    id: string;
    away: string;
    home: string;
    details?: string;
    spread?: number;
    odds?: unknown;
  }>,
) => ({
  events: events.map((event) => ({
    id: event.id,
    competitions: [
      {
        competitors: [
          { homeAway: "away", team: { abbreviation: event.away } },
          { homeAway: "home", team: { abbreviation: event.home } },
        ],
        odds:
          event.odds ??
          (event.details || event.spread != null
            ? [
                {
                  details: event.details,
                  spread: event.spread,
                },
              ]
            : undefined),
      },
    ],
  })),
});

const row = (partial: Partial<PicksGame> & { id: string }): PicksGame => ({
  eventId: "",
  awayId: "",
  homeId: "",
  line: null,
  pick: null,
  ...partial,
});

describe("picks composer", () => {
  it("loads the scoreboard from the CORS ESPN host", () => {
    expect(PICKS_SCOREBOARD_URL("2026-10-21")).toContain("site.web.api.espn.com");
    expect(PICKS_SCOREBOARD_URL("2026-10-21")).toContain("20261021");
  });

  it("reads a real ESPN spread as the away line and never invents a number", () => {
    const games = parsePicksScoreboard(
      scoreboard([
        { id: "401", away: "ATL", home: "ORL", details: "ORL -2.5", spread: -2.5 },
        { id: "402", away: "NY", home: "BOS", details: "BOS -7", spread: -7 },
        { id: "403", away: "DEN", home: "LAL" },
      ]),
      "2026-10-21",
    );
    expect(games).toHaveLength(3);
    expect(games[0]?.awayId).toBe("ATL");
    expect(games[0]?.homeId).toBe("ORL");
    expect(games[0]?.line).toBe(2.5);
    expect(formatPicksLine(games[0]?.line)).toBe("+2.5");
    expect(games[1]?.awayId).toBe("NYK");
    expect(games[1]?.line).toBe(7);
    expect(formatPicksLine(games[1]?.line)).toBe("+7");
    expect(games[2]?.line).toBeNull();
    expect(formatPicksLine(games[2]?.line)).toBe("");
  });

  it("keeps PK / EVEN as a real pick'em and leaves missing odds blank", () => {
    expect(parseEspnAwayLine({ odds: [{ details: "EVEN" }] }, "BOS", "NYK")).toBe(
      0,
    );
    expect(formatPicksLine(0)).toBe("PK");
    expect(parseEspnAwayLine({ odds: [] }, "BOS", "NYK")).toBeNull();
    expect(parseEspnAwayLine({}, "BOS", "NYK")).toBeNull();
    expect(
      parseEspnAwayLine(
        { odds: [{ details: "ORL -2.5", spread: -2.5 }] },
        "ORL",
        "ATL",
      ),
    ).toBe(-2.5);
  });

  it("parses typed lines including plus, minus, and PK", () => {
    expect(parsePicksLineInput("PK")).toBe(0);
    expect(parsePicksLineInput("pick")).toBe(0);
    expect(parsePicksLineInput("+3")).toBe(3);
    expect(parsePicksLineInput("3")).toBe(3);
    expect(parsePicksLineInput("-2.5")).toBe(-2.5);
    expect(parsePicksLineInput("−4")).toBe(-4);
    expect(parsePicksLineInput("")).toBeNull();
    expect(parsePicksLineInput("nope")).toBeUndefined();
    expect(formatPicksLine(3)).toBe("+3");
    expect(formatPicksLine(-2.5)).toBe("-2.5");
  });

  it("keeps a check when the line is edited and clears it if that side’s team leaves", () => {
    const picked = togglePicksPick(
      row({ id: "a", eventId: "1", awayId: "ATL", homeId: "ORL", line: 2.5 }),
      "away",
    );
    expect(picked.pick).toBe("away");
    const edited = setPicksLine(picked, 4);
    expect(edited.pick).toBe("away");
    expect(edited.line).toBe(4);
    expect(edited.lineEdited).toBe(true);
    const swappedAway = setPicksTeam(edited, "away", "BOS");
    expect(swappedAway.awayId).toBe("BOS");
    expect(swappedAway.pick).toBeNull();
    const homePick = togglePicksPick(edited, "home");
    const swappedAwayKeepHome = setPicksTeam(homePick, "away", "BOS");
    expect(swappedAwayKeepHome.pick).toBe("home");
    const swappedHome = setPicksTeam(homePick, "home", "MIA");
    expect(swappedHome.pick).toBeNull();
  });

  it("merges Fill so edited rows stick and unedited ESPN leftovers drop", () => {
    const current: PicksGame[] = [
      row({
        id: "keep-line",
        eventId: "401",
        awayId: "ATL",
        homeId: "ORL",
        line: 6,
        pick: "home",
        lineEdited: true,
      }),
      row({
        id: "keep-teams",
        eventId: "402",
        awayId: "BOS",
        homeId: "NYK",
        line: 3,
        pick: "away",
        teamsEdited: true,
      }),
      row({
        id: "custom",
        eventId: "",
        awayId: "CHI",
        homeId: "MIL",
        line: 1.5,
        custom: true,
        pick: "away",
      }),
      row({
        id: "stale",
        eventId: "404",
        awayId: "DEN",
        homeId: "LAL",
        line: 2,
      }),
    ];
    const incoming = parsePicksScoreboard(
      scoreboard([
        { id: "401", away: "ATL", home: "ORL", details: "ORL -2.5", spread: -2.5 },
        { id: "402", away: "NY", home: "BOS", details: "BOS -7", spread: -7 },
        { id: "403", away: "MIA", home: "PHI", details: "PHI -1", spread: -1 },
      ]),
      "2026-10-21",
    );
    const merged = mergePicksFill(current, incoming);
    expect(merged.map((game) => game.eventId)).toEqual(["401", "402", "403", ""]);
    expect(merged[0]?.id).toBe("keep-line");
    expect(merged[0]?.line).toBe(6);
    expect(merged[0]?.pick).toBe("home");
    expect(merged[1]?.awayId).toBe("BOS");
    expect(merged[1]?.homeId).toBe("NYK");
    expect(merged[1]?.pick).toBe("away");
    expect(merged[2]?.awayId).toBe("MIA");
    expect(merged[3]?.awayId).toBe("CHI");
    expect(merged.some((game) => game.id === "stale")).toBe(false);
    expect(isPicksRowEdited(current[2]!)).toBe(true);
  });

  it("re-fills one row from the slate and drops that row’s edit flags", () => {
    const game = row({
      id: "keep-line",
      eventId: "401",
      awayId: "ATL",
      homeId: "ORL",
      line: 9,
      pick: "away",
      lineEdited: true,
    });
    const incoming = parsePicksScoreboard(
      scoreboard([
        { id: "401", away: "ATL", home: "ORL", details: "ORL -2.5", spread: -2.5 },
      ]),
      "2026-10-21",
    );
    const next = refillPicksRow(game, incoming);
    expect(next.id).toBe("keep-line");
    expect(next.line).toBe(2.5);
    expect(next.lineEdited).toBeUndefined();
    expect(next.pick).toBe("away");
  });

  it("fills the 4:5 so 8–15 games are a finished poster, not a short card", () => {
    const fill = picksFillLayout(11);
    expect(fill.listTop + fill.listH + fill.listBottom).toBe(GRAPHIC_HEIGHT);
    expect(fill.rowH * 11 + fill.gap * 10).toBeCloseTo(fill.listH);
    expect(fill.logo).toBeGreaterThanOrEqual(34);
    expect(fill.line).toBeGreaterThanOrEqual(22);
    const one = picksFillLayout(1);
    expect(one.logo).toBeGreaterThan(fill.logo);
    expect(emptyPicksGame().custom).toBe(true);
  });
});
