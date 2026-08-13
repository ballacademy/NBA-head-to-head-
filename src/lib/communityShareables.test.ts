import { describe, expect, it } from "vitest";
import { formatCommunityAttachmentChip } from "./communityShareables";

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
