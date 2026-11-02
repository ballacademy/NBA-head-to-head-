import { describe, expect, it } from "vitest";
import { GRAPHIC_HEIGHT } from "../standingsComposer/rankingState";
import {
  ESPN_INJURIES_URL,
  INJURY_POST_PLAYER_MAX,
  INJURY_POST_TEAM_MAX,
  cycleInjuryKicker,
  groupInjuriesByTeam,
  injuryFillLayout,
  normalizeInjuryKicker,
  parseInjuryPayload,
  selectInjuryPost,
} from "./injuryState";

describe("injury report", () => {
  it("loads injuries from the CORS-safe ESPN host", () => {
    expect(ESPN_INJURIES_URL).toContain("site.web.api.espn.com");
    expect(ESPN_INJURIES_URL).not.toContain("site.api.espn.com");
  });

  it("maps ESPN statuses onto Headline-style OUT / GTD kickers", () => {
    expect(normalizeInjuryKicker("Out")).toBe("OUT");
    expect(normalizeInjuryKicker("Day-To-Day")).toBe("GTD");
    expect(normalizeInjuryKicker("Questionable")).toBe("QUESTIONABLE");
    expect(normalizeInjuryKicker("Available")).toBeNull();
    const players = parseInjuryPayload({
      injuries: [
        {
          team: { abbreviation: "LAL" },
          injuries: [
            {
              status: "Out",
              athlete: { id: "1966", displayName: "LeBron James", shortName: "L. James" },
            },
            {
              status: "Day-To-Day",
              athlete: { id: "406", displayName: "Austin Reaves", shortName: "A. Reaves" },
            },
          ],
        },
      ],
    });
    expect(players).toHaveLength(2);
    const grouped = groupInjuriesByTeam(players);
    expect(grouped[0]?.teamId).toBe("LAL");
    expect(grouped[0]?.players.map((row) => row.status)).toEqual(["OUT", "GTD"]);
    const namelessId = parseInjuryPayload({
      injuries: [
        {
          injuries: [
            {
              status: "Out",
              athlete: {
                displayName: "Jock Landale",
                team: { abbreviation: "ATL" },
              },
            },
          ],
        },
      ],
    });
    expect(namelessId[0]).toMatchObject({
      id: "ATL:Jock Landale",
      name: "Jock Landale",
      teamId: "ATL",
      status: "OUT",
    });
    expect(cycleInjuryKicker("OUT")).toBe("GTD");
    expect(cycleInjuryKicker("REST")).toBe("OUT");
  });

  it("fills the 4:5 with stretched two-column rows instead of a dead metal band", () => {
    const fill = injuryFillLayout(14);
    expect(fill.listH / GRAPHIC_HEIGHT).toBeGreaterThan(0.72);
    expect(fill.listTop + fill.listH + fill.listBottom).toBe(GRAPHIC_HEIGHT);
    expect(fill.rows).toBe(7);
    expect(fill.logo).toBeGreaterThanOrEqual(52);
    expect(fill.name).toBeGreaterThanOrEqual(16);
    const sparse = injuryFillLayout(4);
    expect(sparse.rowH).toBeGreaterThan(fill.rowH);
    expect(sparse.logo).toBeGreaterThanOrEqual(fill.logo);
  });

  it("caps Fill to OUT names that still read as an IG post", () => {
    const players = Array.from({ length: 28 }, (_, index) => ({
      id: `p-${index}`,
      name: `Player ${index}`,
      shortName: `P${index}`,
      teamId: ["ATL", "BOS", "BKN", "CHA", "CHI", "CLE", "DAL", "DEN", "DET", "GSW", "HOU", "IND", "LAC", "LAL"][
        index % 14
      ]!,
      status: index % 3 === 0 ? ("GTD" as const) : ("OUT" as const),
      detail: "",
    }));
    const post = selectInjuryPost(players);
    expect(post.length).toBeLessThanOrEqual(INJURY_POST_TEAM_MAX);
    expect(post.every((block) => block.players.every((row) => row.status === "OUT"))).toBe(
      true,
    );
    expect(
      post.every((block) => block.players.length <= INJURY_POST_PLAYER_MAX),
    ).toBe(true);
    const withGtd = selectInjuryPost(players, true);
    expect(withGtd.some((block) => block.players.some((row) => row.status === "GTD"))).toBe(
      true,
    );
  });
});
