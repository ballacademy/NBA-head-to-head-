import { describe, expect, it } from "vitest";
import { players } from "./playerPool";
import { calculateLineupScore, getPlayersById } from "./scoring";
import {
  adjustTeamWinsForStarterAvailability,
  getSameTeamRecordAnchor,
  getStarterAvailability,
} from "./teamRecordBaseline";

const lineup = (ids: string[]) => getPlayersById(ids, players);

describe("teamRecordBaseline", () => {
  it("bumps baseline wins when starters missed significant time", () => {
    expect(adjustTeamWinsForStarterAvailability(21, 1)).toBe(21);
    expect(adjustTeamWinsForStarterAvailability(21, 0.5)).toBeGreaterThan(21);
    expect(adjustTeamWinsForStarterAvailability(68, 0.5)).toBeGreaterThan(68);
  });

  it("returns an anchor only for five-player same-team lineups", () => {
    const okc = lineup([
      "gilgesh01-okc",
      "holmgch01-okc",
      "willija06-okc",
      "harteis01-okc",
      "dortlu01-okc",
    ]);

    expect(getSameTeamRecordAnchor(okc)?.team).toBe("OKC");
    expect(getSameTeamRecordAnchor(okc)?.actualWins).toBe(68);

    expect(
      getSameTeamRecordAnchor(
        lineup([
          "gilgesh01-okc",
          "whitede01-bos",
          "tatumja01-bos",
          "gordoaa01-den",
          "jokicni01-den",
        ]),
      ),
    ).toBeNull();
  });

  it("anchors full-team lineups closer to prior-season records", () => {
    const okc = lineup([
      "gilgesh01-okc",
      "holmgch01-okc",
      "willija06-okc",
      "harteis01-okc",
      "dortlu01-okc",
    ]);
    const score = calculateLineupScore(okc);
    const anchor = getSameTeamRecordAnchor(okc);

    expect(anchor).not.toBeNull();
    expect(score.projectedRecord.wins).toBeGreaterThanOrEqual(58);
    expect(score.projectedRecord.wins).toBeLessThanOrEqual(72);
    expect(getStarterAvailability(okc)).toBeGreaterThan(0.6);
  });

  it("does not over-inflate injured small-market teams beyond recovery cap", () => {
    const pelicans = players
      .filter((player) => player.team === "NOP")
      .sort((left, right) => right.minutes - left.minutes)
      .slice(0, 5);

    const score = calculateLineupScore(pelicans);
    const anchor = getSameTeamRecordAnchor(pelicans);

    expect(anchor?.actualWins).toBe(21);
    expect(score.projectedRecord.wins).toBeGreaterThanOrEqual(20);
    expect(score.projectedRecord.wins).toBeLessThanOrEqual(40);
  });
});
