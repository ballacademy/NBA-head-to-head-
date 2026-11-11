import { describe, expect, it } from "vitest";
import { defaultMockTradeDraft } from "./mockTradeState";
import {
  ESPN_ATHLETE_OVERVIEW_URL,
  ESPN_NBA_NEWS_URL,
  ESPN_STORY_URL,
  applyReportedTrade,
  extractEspnPlayers,
  extractEspnTeams,
  extractTradeStoryIds,
  parseReportedTradeHtml,
} from "./mockTradeNews";

const DILLINGHAM_HTML = `
<p>The <a href="https://www.espn.com/nba/team/_/name/chi/chicago-bulls">Chicago Bulls</a> and <a href="https://www.espn.com/nba/team/_/name/cha/charlotte-hornets">Charlotte Hornets</a> agreed to a trade sending <a href="https://www.espn.com/nba/player/_/id/4684275/rob-dillingham">Rob Dillingham</a> to Charlotte for <a href="https://www.espn.com/nba/player/_/id/2990984/buddy-hield">Buddy Hield</a> and cash, the teams announced Saturday.</p>
`;

const BROWN_HTML = `
<p>the first matchup between the <a href="https://www.espn.com/nba/team/_/name/bos/boston-celtics">Boston Celtics</a> and <a href="https://www.espn.com/nba/team/_/name/phi/philadelphia-76ers">Philadelphia 76ers</a> since the blockbuster trade this summer that sent <a href="https://www.espn.com/nba/player/_/id/3917376/jaylen-brown">Jaylen Brown</a> to Philadelphia.</p>
`;

const LAB_HTML = `
<p>NBA Trade Lab updates: How could the Lakers level up? Trade No. 1: Lakers get: <a href="https://www.espn.com/nba/player/_/id/4278078/pj-washington">P.J. Washington</a></p>
`;

const FAILED_HTML = `
<p>ESPN's Shams Charania reported that the last time <a href="https://www.espn.com/nba/player/_/id/3917376/jaylen-brown">Jaylen Brown</a> and <a href="https://www.espn.com/nba/player/_/id/4065648/jayson-tatum">Jayson Tatum</a> spoke was in June after the <a href="https://www.espn.com/nba/team/_/name/bos/boston-celtics">Boston Celtics</a> failed to trade for <a href="https://www.espn.com/nba/player/_/id/3032977/giannis-antetokounmpo">Giannis Antetokounmpo</a>.</p>
`;

const GRADES_HTML = `
<h2><a href="https://www.espn.com/nba/story/_/id/49241843/sources-celtics-sending-brown-76ers-george-picks">Celtics trade Jaylen Brown to Sixers for Paul George, picks</a></h2>
<p><strong><a href="https://www.espn.com/nba/team/_/name/bos/boston-celtics">Boston Celtics</a> get:</strong> F <a href="https://www.espn.com/nba/player/_/id/4251/paul-george">Paul George</a>, 2028 first-round pick (could convert to a pick swap), 2031 first-round pick (unprotected), 2028 and 2030 second-round picks<br>
<strong><a href="https://www.espn.com/nba/team/_/name/phi/philadelphia-76ers">Philadelphia 76ers</a> get:</strong> G <a href="https://www.espn.com/nba/player/_/id/3917376/jaylen-brown">Jaylen Brown</a></p>
`;

const DEDICATED_HTML = `
<p><a href="https://www.espn.com/nba/player/_/id/3917376/jaylen-brown">Jaylen Brown</a> has a new home, as the <a href="https://www.espn.com/nba/team/_/name/bos/boston-celtics">Boston Celtics</a> agreed to send the former NBA Finals MVP to the <a href="https://www.espn.com/nba/team/_/name/phi/philadelphia-76ers">Philadelphia 76ers</a> in a blockbuster trade Wednesday, sources told ESPN's Shams Charania.</p>
<p>The 76ers are sending <a href="https://www.espn.com/nba/player/_/id/4251/paul-george">Paul George</a>, two first-round picks (2028, 2031) and two second-round selections (2028, 2030) to Boston to complete the deal, sources said.</p>
<p>The 2028 first-round pick could convert from a first to a swap that is more favorable to Boston.</p>
`;

describe("mock trade ESPN reports", () => {
  it("uses the same ESPN hosts as Stat/POTD plus ESPN news stories", () => {
    expect(ESPN_NBA_NEWS_URL).toContain("site.web.api.espn.com");
    expect(ESPN_ATHLETE_OVERVIEW_URL("3917376")).toContain(
      "site.web.api.espn.com",
    );
    expect(ESPN_STORY_URL("50028196")).toContain("content.core.api.espn.com");
  });

  it("parses a completed two-team trade with cash from ESPN HTML", () => {
    expect(extractEspnTeams(DILLINGHAM_HTML)).toEqual(["CHI", "CHA"]);
    expect(extractEspnPlayers(DILLINGHAM_HTML).map((row) => row.id)).toEqual([
      "4684275",
      "2990984",
    ]);
    const sides = parseReportedTradeHtml(
      DILLINGHAM_HTML,
      "4684275",
      "Rob Dillingham",
    );
    expect(sides?.[0]?.teamId).toBe("CHA");
    expect(sides?.[0]?.players.map((row) => row.id)).toEqual(["4684275"]);
    expect(sides?.[1]?.teamId).toBe("CHI");
    expect(sides?.[1]?.players.map((row) => row.id)).toEqual(["2990984"]);
    expect(sides?.[1]?.picks.some((pick) => pick.cash)).toBe(true);
    const filled = applyReportedTrade(defaultMockTradeDraft(), {
      headline: "Bulls trade Dillingham",
      storyId: "1",
      sides: sides!,
    });
    expect(filled.sides[0]?.teamId).toBe("CHA");
    expect(filled.sides[1]?.teamId).toBe("CHI");
    expect(filled.sides[0]?.players[0]?.playerId).toBe("4684275");
    expect(filled.sides[1]?.players[0]?.lastName).toMatch(/Hield/i);
    expect(filled.sides[1]?.picks[0]?.cash).toBe(true);
    expect(filled.sides[0]?.picks).toEqual([]);
    const withOtherDeal = `${DILLINGHAM_HTML}
<p>Dillingham could have a larger role in Charlotte, which traded longtime starting guard <a href="https://www.espn.com/nba/player/_/id/4432816/lamelo-ball">LaMelo Ball</a> to the <a href="https://www.espn.com/nba/team/_/name/min/minnesota-timberwolves">Minnesota Timberwolves</a> earlier this offseason.</p>`;
    const kept = parseReportedTradeHtml(
      withOtherDeal,
      "4684275",
      "Rob Dillingham",
    );
    expect(kept?.map((side) => side.teamId).sort()).toEqual(["CHA", "CHI"]);
    expect(
      kept?.flatMap((side) => side.players.map((row) => row.id)),
    ).toEqual(["4684275", "2990984"]);
  });

  it("fills only named ESPN assets for Brown-to-PHI and skips mocks", () => {
    const sides = parseReportedTradeHtml(
      BROWN_HTML,
      "3917376",
      "Jaylen Brown",
    );
    expect(sides?.[0]?.teamId).toBe("PHI");
    expect(sides?.[1]?.teamId).toBe("BOS");
    expect(sides?.[0]?.players.map((row) => row.id)).toEqual(["3917376"]);
    expect(sides?.[1]?.players).toEqual([]);
    const brownWithHeat =
      `${BROWN_HTML.replace("</p>", " They then discuss the slow start for the Miami Heat and Kristaps Porzingis.</p>")}`;
    expect(
      parseReportedTradeHtml(brownWithHeat, "3917376", "Jaylen Brown")?.[1]
        ?.players,
    ).toEqual([]);
    expect(
      parseReportedTradeHtml(LAB_HTML, "4278078", "P.J. Washington"),
    ).toBeNull();
    expect(
      parseReportedTradeHtml(FAILED_HTML, "3917376", "Jaylen Brown"),
    ).toBeNull();
    const mixed = `${BROWN_HTML}<p>they discuss if a Kristaps Porzingis trade could help the Warriors</p>`;
    expect(
      parseReportedTradeHtml(mixed, "3917376", "Jaylen Brown")?.[0]?.teamId,
    ).toBe("PHI");
  });

  it("fills every named player and pick on both sides from ESPN get-lines", () => {
    const sides = parseReportedTradeHtml(
      GRADES_HTML,
      "3917376",
      "Jaylen Brown",
    );
    expect(sides?.[0]?.teamId).toBe("PHI");
    expect(sides?.[0]?.players.map((row) => row.id)).toEqual(["3917376"]);
    expect(sides?.[1]?.teamId).toBe("BOS");
    expect(sides?.[1]?.players.map((row) => row.id)).toEqual(["4251"]);
    expect(
      sides?.[1]?.picks.map((pick) => `${pick.year} ${pick.round}${pick.swap ? " swap" : ""}`),
    ).toEqual(["2028 1st swap", "2031 1st", "2028 2nd", "2030 2nd"]);
    expect(sides?.[0]?.picks).toEqual([]);
    const filled = applyReportedTrade(defaultMockTradeDraft(), {
      headline: "Celtics trade Jaylen Brown",
      storyId: "49135150",
      sides: sides!,
    });
    expect(filled.sides[1]?.players[0]?.lastName).toMatch(/George/i);
    expect(filled.sides[1]?.picks).toHaveLength(4);
    const mixedThin = parseReportedTradeHtml(
      `${BROWN_HTML}${GRADES_HTML}`,
      "3917376",
      "Jaylen Brown",
    );
    expect(mixedThin?.[1]?.players.map((row) => row.id)).toEqual(["4251"]);
    expect(mixedThin?.[1]?.picks).toHaveLength(4);
    expect(
      extractTradeStoryIds(GRADES_HTML),
    ).toContain("49241843");
  });

  it("fills named return pieces from a dedicated ESPN announcement", () => {
    const sides = parseReportedTradeHtml(
      DEDICATED_HTML,
      "3917376",
      "Jaylen Brown",
    );
    expect(sides?.[0]?.teamId).toBe("PHI");
    expect(sides?.[0]?.players.map((row) => row.id)).toEqual(["3917376"]);
    expect(sides?.[1]?.teamId).toBe("BOS");
    expect(sides?.[1]?.players.map((row) => row.id)).toEqual(["4251"]);
    expect(
      sides?.[1]?.picks.map((pick) => `${pick.year} ${pick.round}${pick.swap ? " swap" : ""}`),
    ).toEqual(["2028 1st swap", "2031 1st", "2028 2nd", "2030 2nd"]);
  });
});
