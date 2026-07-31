import { describe, expect, it } from "vitest";
import { players } from "./playerPool";
import { calculateLineupScore, getPlayersById } from "./scoring";
import {
  adjustTeamWinsForStarterAvailability,
  getLineupTeamQualityRawAdjustment,
  getPlayerTeamQualityTeam,
  getSameTeamRecordAnchor,
  getStarterAvailability,
  isBenchMajorityPlayer,
} from "./teamRecordBaseline";

const lineup = (ids: string[]) => getPlayersById(ids, players);

describe("teamRecordBaseline", () => {
  it("bumps baseline wins when starters missed significant time", () => {
    expect(adjustTeamWinsForStarterAvailability(21, 1)).toBe(21);
    expect(adjustTeamWinsForStarterAvailability(21, 0.5)).toBeGreaterThan(21);
    expect(adjustTeamWinsForStarterAvailability(64, 0.5)).toBeGreaterThan(64);
  });

  it("returns an anchor only for five-player same-team lineups", () => {
    const okc = lineup([
      "gilgesh01-okc",
      "holmgch01-okc",
      "willija06-okc",
      "harteis01-okc",
      "mitchaj01-okc",
    ]);

    expect(getSameTeamRecordAnchor(okc)?.team).toBe("OKC");
    expect(getSameTeamRecordAnchor(okc)?.actualWins).toBe(64);

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
      "mitchaj01-okc",
    ]);
    const score = calculateLineupScore(okc);
    const anchor = getSameTeamRecordAnchor(okc);

    expect(anchor).not.toBeNull();
    expect(score.projectedRecord.wins).toBeGreaterThanOrEqual(55);
    expect(score.projectedRecord.wins).toBeLessThanOrEqual(70);
    expect(getStarterAvailability(okc)).toBeGreaterThan(0.6);
  });

  it("adds a raw boost for lineups built from stronger teams", () => {
    const mixed = lineup([
      "doncilu01-lal",
      "pritcpa01-bos",
      "holmgch01-okc",
      "gilgesh01-okc",
      "tatumja01-bos",
    ]);

    expect(getLineupTeamQualityRawAdjustment(mixed)).toBeGreaterThan(0);
  });

  it("excludes bench-majority players and down-weights low-impact role players", () => {
    const minott = players.find((player) => player.bbrPlayerId === "minotjo01");
    const tatum = players.find((player) => player.bbrPlayerId === "tatumja01");
    const brown = players.find((player) => player.bbrPlayerId === "brownja02");
    const sga = players.find((player) => player.bbrPlayerId === "gilgesh01");
    const jokic = players.find((player) => player.bbrPlayerId === "jokicni01");

    expect(minott && tatum && brown && sga && jokic).toBeTruthy();
    expect(getPlayerTeamQualityTeam(minott!)).toBe("BOS");
    expect(isBenchMajorityPlayer(minott!)).toBe(true);
    expect(isBenchMajorityPlayer(tatum!)).toBe(false);

    // Bench-majority BOS role player contributes nothing on his own.
    expect(
      getLineupTeamQualityRawAdjustment([
        minott!,
        minott!,
        minott!,
        minott!,
        minott!,
      ]),
    ).toBe(0);

    const withMinott = [tatum!, brown!, sga!, jokic!, minott!];
    const withoutMinott = [tatum!, brown!, sga!, jokic!, brown!];

    // Replacing a star with Minott must not keep the same equal-share BOS boost.
    expect(getLineupTeamQualityRawAdjustment(withMinott)).toBeLessThanOrEqual(
      getLineupTeamQualityRawAdjustment(withoutMinott),
    );
  });

  it("uses stats-season teams for quality, not later roster moves", () => {
    const naz = players.find((player) => player.bbrPlayerId === "reidna01");
    expect(naz).toBeDefined();
    expect(naz?.team).toBe("CHO");
    expect(naz?.statsTeam).toBe("MIN");
    expect(getPlayerTeamQualityTeam(naz!)).toBe("MIN");

    const emb = players.find((player) => player.bbrPlayerId === "embiijo01");
    expect(emb?.team).toBe("PHI");
    expect(getPlayerTeamQualityTeam(emb!)).toBe("PHI");
  });

  it("anchors same-team projected records on stats-season clubs", () => {
    const naz = players.find((player) => player.bbrPlayerId === "reidna01")!;
    const wolves = [
      naz,
      ...players
        .filter(
          (player) =>
            player.bbrPlayerId !== "reidna01" &&
            getPlayerTeamQualityTeam(player) === "MIN",
        )
        .sort((left, right) => right.minutes - left.minutes)
        .slice(0, 4),
    ];

    expect(wolves).toHaveLength(5);
    expect(naz.team).not.toBe("MIN");
    expect(getSameTeamRecordAnchor(wolves)?.team).toBe("MIN");
  });

  it("does not over-inflate injured small-market teams beyond recovery cap", () => {
    const pelicans = players
      .filter((player) => player.team === "NOP")
      .sort((left, right) => right.minutes - left.minutes)
      .slice(0, 5);

    const score = calculateLineupScore(pelicans);
    const anchor = getSameTeamRecordAnchor(pelicans);

    expect(anchor?.actualWins).toBe(26);
    expect(score.projectedRecord.wins).toBeGreaterThanOrEqual(20);
    expect(score.projectedRecord.wins).toBeLessThanOrEqual(45);
  });
});
