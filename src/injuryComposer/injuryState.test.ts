import { describe, expect, it } from "vitest";
import { GRAPHIC_HEIGHT } from "../standingsComposer/rankingState";
import {
  groupInjuriesByTeam,
  injuryFillLayout,
  normalizeInjuryKicker,
  parseInjuryPayload,
} from "./injuryState";

describe("injury report", () => {
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
});
