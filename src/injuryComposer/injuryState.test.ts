import { describe, expect, it } from "vitest";
import {
  groupInjuriesByTeam,
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
});
