import { describe, expect, it } from "vitest";
import { formatCompactPlayerName, players, statsFile } from "./playerPool";

describe("playerPool", () => {
  it("formats compact player names with first initial and last name", () => {
    expect(formatCompactPlayerName("Cade Cunningham")).toBe("C. Cunningham");
    expect(formatCompactPlayerName("Kareem Abdul-Jabbar")).toBe(
      "K. Abdul-Jabbar",
    );
    expect(formatCompactPlayerName("Nene")).toBe("Nene");
  });
  it("exposes one draftable row per player", () => {
    const ids = statsFile.players.map((player) => player.bbrPlayerId ?? player.id);

    expect(statsFile.playerCount).toBe(statsFile.uniquePlayerCount);
    expect(new Set(ids).size).toBe(ids.length);
    expect(players.every((player) => !player.team.endsWith("TM"))).toBe(true);
  });

  it("uses current-team overrides for traded stars", () => {
    const davis = players.find((player) => player.name === "Anthony Davis");
    const young = players.find((player) => player.name === "Trae Young");

    expect(davis?.team).toBe("WAS");
    expect(young?.team).toBe("WAS");
  });
});
