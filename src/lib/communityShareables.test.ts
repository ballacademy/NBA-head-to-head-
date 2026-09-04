import { describe, expect, it } from "vitest";
import {
  buildMatchupShareCardInputsFromAttachment,
  buildShareCardInputFromAttachment,
  formatCommunityAttachmentChip,
  formatCommunityMatchupDetails,
} from "./communityShareables";
import type { Player } from "./types";

const stubPlayer = (id: string, name: string): Player =>
  ({
    id,
    name,
    team: "BOS",
    position: "PG",
    positions: ["PG"],
  }) as Player;

describe("formatCommunityAttachmentChip", () => {
  it("shortens matchup attachments", () => {
    expect(
      formatCommunityAttachmentChip({
        kind: "matchup",
        modeLabel: "Pro Head-to-Head",
        result: "win",
        userTeam: "Aces",
        opponentTeam: "Rivals",
        userOvr: 88,
        opponentOvr: 84,
        userLineupNames: [],
        opponentLineupNames: [],
        savedAt: "2026-07-01T00:00:00.000Z",
      }),
    ).toBe("Pro · W · 88–84");
  });

  it("keeps overflow in matchup chip scores", () => {
    expect(
      formatCommunityAttachmentChip({
        kind: "matchup",
        modeLabel: "Pro Head-to-Head",
        result: "win",
        userTeam: "Aces",
        opponentTeam: "Rivals",
        userOvr: 100,
        opponentOvr: 100,
        ovrOverflow: 4,
        opponentOvrOverflow: 0,
        userLineupNames: [],
        opponentLineupNames: [],
        savedAt: "2026-07-01T00:00:00.000Z",
      }),
    ).toBe("Pro · W · 100(+4)–100");
  });

  it("shortens All-Time matchup attachments", () => {
    expect(
      formatCommunityAttachmentChip({
        kind: "matchup",
        modeLabel: "All-Time Draft",
        result: "tie",
        userTeam: "Aces",
        opponentTeam: "Rivals",
        userOvr: 88,
        opponentOvr: 88,
        userLineupNames: [],
        opponentLineupNames: [],
        savedAt: "2026-07-01T00:00:00.000Z",
      }),
    ).toBe("All-Time · T · 88–88");
  });

  it("shortens casual matchup attachments", () => {
    expect(
      formatCommunityAttachmentChip({
        kind: "matchup",
        modeLabel: "Casual Head to Head",
        result: "win",
        userTeam: "Aces",
        opponentTeam: "Rivals",
        userOvr: 88,
        opponentOvr: 84,
        userLineupNames: [],
        opponentLineupNames: [],
        savedAt: "2026-07-01T00:00:00.000Z",
      }),
    ).toBe("Casual · W · 88–84");
  });

  it("maps stored Classic labels to Casual", () => {
    expect(
      formatCommunityAttachmentChip({
        kind: "matchup",
        modeLabel: "Classic Head-to-Head",
        result: "loss",
        userTeam: "Aces",
        opponentTeam: "Rivals",
        userOvr: 80,
        opponentOvr: 90,
        userLineupNames: [],
        opponentLineupNames: [],
        savedAt: "2026-07-01T00:00:00.000Z",
      }),
    ).toBe("Casual · L · 80–90");
  });

  it("shortens daily lineup attachments", () => {
    expect(
      formatCommunityAttachmentChip({
        kind: "lineup",
        title: "My Daily",
        modeLabel: "Daily Draft",
        percentileLabel: "Top 12%",
        lineupNames: [],
        savedAt: "2026-07-01T00:00:00.000Z",
      }),
    ).toBe("Daily · Top 12%");
  });

  it("shortens tier list attachments", () => {
    expect(
      formatCommunityAttachmentChip({
        kind: "tierList",
        title: "Best shooters in the East this season",
        publishedId: "pub-1",
        savedAt: "2026-07-01T00:00:00.000Z",
      }),
    ).toBe("Tier · Best shooters in the East t…");
  });
});

describe("matchup share card record", () => {
  const playersById = new Map<string, Player>([
    ["p1", stubPlayer("p1", "Guard")],
    ["p2", stubPlayer("p2", "Other")],
  ]);

  it("prefers projected team W-L on the lineup share card", () => {
    const input = buildShareCardInputFromAttachment(
      {
        kind: "matchup",
        modeLabel: "Casual Head to Head",
        result: "win",
        userTeam: "Aces",
        opponentTeam: "Rivals",
        userOvr: 91,
        opponentOvr: 87,
        userLineupNames: ["Guard"],
        opponentLineupNames: ["Other"],
        userLineupIds: ["p1"],
        userRecord: "50-32",
        userWinRecord: "12-5",
        savedAt: "2026-07-01T00:00:00.000Z",
      },
      playersById,
    );

    expect(input?.record).toBe("50-32");
    expect(input?.recordLabel).toBe("Projected");
  });

  it("falls back to lineup names when stored ids are stale", () => {
    const input = buildShareCardInputFromAttachment(
      {
        kind: "matchup",
        modeLabel: "Casual Head to Head",
        result: "win",
        userTeam: "Aces",
        opponentTeam: "Rivals",
        userOvr: 91,
        opponentOvr: 87,
        userLineupNames: ["Guard"],
        opponentLineupNames: ["Other"],
        userLineupIds: ["missing-id"],
        savedAt: "2026-07-01T00:00:00.000Z",
      },
      playersById,
    );

    expect(input?.lineup.map((player) => player.name)).toEqual(["Guard"]);
  });

  it("falls back to competitive record when projected is missing", () => {
    const input = buildShareCardInputFromAttachment(
      {
        kind: "matchup",
        modeLabel: "Casual Head to Head",
        result: "loss",
        userTeam: "Aces",
        opponentTeam: "Rivals",
        userOvr: 80,
        opponentOvr: 90,
        userLineupNames: ["Guard"],
        opponentLineupNames: ["Other"],
        userLineupIds: ["p1"],
        userWinRecord: "12-5",
        savedAt: "2026-07-01T00:00:00.000Z",
      },
      playersById,
    );

    expect(input?.record).toBe("12-5");
    expect(input?.recordLabel).toBe("This month");
  });

  it("labels competitive W-L as this month in matchup details", () => {
    expect(
      formatCommunityMatchupDetails({
        kind: "matchup",
        modeLabel: "Casual Head to Head",
        result: "win",
        userTeam: "Aces",
        opponentTeam: "Rivals",
        userOvr: 91,
        opponentOvr: 87,
        userLineupNames: ["A"],
        opponentLineupNames: ["B"],
        userWinRecord: "12-5",
        savedAt: "2026-07-01T00:00:00.000Z",
      }).record,
    ).toBe("This month 12-5");
  });

  it("surfaces projected team W-L in matchup details", () => {
    expect(
      formatCommunityMatchupDetails({
        kind: "matchup",
        modeLabel: "Casual Head to Head",
        result: "win",
        userTeam: "Aces",
        opponentTeam: "Rivals",
        userOvr: 91,
        opponentOvr: 87,
        userLineupNames: ["A"],
        opponentLineupNames: ["B"],
        userRecord: "50-32",
        userWinRecord: "12-5",
        savedAt: "2026-07-01T00:00:00.000Z",
      }).record,
    ).toBe("Projected 50-32");
  });

  it("keeps mode/date/brand on the user card and mirrors projected record for the opponent", () => {
    const inputs = buildMatchupShareCardInputsFromAttachment(
      {
        kind: "matchup",
        modeLabel: "Casual Head to Head",
        result: "win",
        userTeam: "Aces",
        opponentTeam: "Rivals",
        userOvr: 91,
        opponentOvr: 87,
        userLineupNames: ["Guard"],
        opponentLineupNames: ["Other"],
        userLineupIds: ["p1"],
        opponentLineupIds: ["p2"],
        userRecord: "50-32",
        opponentRecord: "44-38",
        savedAt: "2026-07-01T00:00:00.000Z",
      },
      playersById,
    );

    expect(inputs).not.toBeNull();
    expect(inputs!.user.subhead).toBe("Casual Head to Head");
    expect(inputs!.user.footerNote).toMatch(/^Saved /);
    expect(inputs!.user.record).toBe("50-32");
    expect(inputs!.user.recordLabel).toBe("Projected");
    expect(inputs!.user.showBrandChrome).not.toBe(false);

    expect(inputs!.opponent.subhead).toBeUndefined();
    expect(inputs!.opponent.footerNote).toBeUndefined();
    expect(inputs!.opponent.showBrandChrome).toBe(false);
    expect(inputs!.opponent.record).toBe("44-38");
    expect(inputs!.opponent.recordLabel).toBe("Projected");
  });
});
