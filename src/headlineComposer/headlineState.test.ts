import { describe, expect, it } from "vitest";
import { EXPORT_HEIGHT, EXPORT_WIDTH } from "../standingsComposer/rankingState";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import {
  GRAPHIC_ASPECT,
  GRAPHIC_HEIGHT,
  GRAPHIC_WIDTH,
  HL_HEADLINE_SIZE,
  HL_WATERMARK,
} from "./headlineLayout";
import {
  clipHeadlineBody,
  DEFAULT_HEADLINE,
  defaultHeadlineDraft,
  fillHeadlineFromPlayer,
  formatHeadlineBody,
  HEADLINE_BODY_MAX,
  headlineLabel,
  splitTeamWordmark,
} from "./headlineState";
import { getTeam } from "../standingsComposer/teams";

describe("headline composer", () => {
  it("keeps a 4:5 full-bleed photo board with a headline plate", () => {
    expect(GRAPHIC_WIDTH).toBe(1200);
    expect(GRAPHIC_HEIGHT).toBe(1500);
    expect(GRAPHIC_ASPECT).toBeCloseTo(0.8);
    expect(EXPORT_WIDTH).toBe(2400);
    expect(EXPORT_HEIGHT).toBe(3000);
    expect(HL_HEADLINE_SIZE).toBeGreaterThan(48);
    expect(HL_WATERMARK).toBeLessThan(0.25);
    const draft = defaultHeadlineDraft();
    expect(draft.headline).toBe(DEFAULT_HEADLINE);
    expect(draft.body).toBe("");
    expect(draft.photoSrc).toBeNull();
    expect(draft.showBa).toBe(true);
    expect(headlineLabel("  massive leap ")).toBe("MASSIVE LEAP");
    expect(clipHeadlineBody("x".repeat(HEADLINE_BODY_MAX + 12))).toHaveLength(
      HEADLINE_BODY_MAX,
    );
  });

  it("picks a player for the team wordmark without a mugshot", () => {
    const luka = getPlayer("3945274")!;
    const next = fillHeadlineFromPlayer(luka, defaultHeadlineDraft());
    expect(next.playerId).toBe(luka.id);
    expect(next.teamId).toBeTruthy();
    expect(next.photoSrc).toBeNull();
    expect(next.customPhoto).toBe(false);
  });

  it("splits city / nickname and writes a last-night body line", () => {
    const spurs = getTeam("SAS")!;
    expect(splitTeamWordmark(spurs)).toEqual({
      city: "SAN ANTONIO",
      nick: "SPURS",
    });
    expect(
      formatHeadlineBody(
        spurs,
        {
          eventId: "1",
          gameDate: "2026-10-13",
          teamId: "SAS",
          opponentId: "OKC",
          opponentAbbrev: "OKC",
          result: "W",
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
          },
        },
        { wins: 18, losses: 7 },
      ),
    ).toBe(
      "AFTER BEATING OKC 111-109 LAST NIGHT, THE SPURS HAVE A RECORD OF 18-7",
    );
  });
});
