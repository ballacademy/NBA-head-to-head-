import { describe, expect, it } from "vitest";
import {
  DEFAULT_OG_IMAGE,
  DEFAULT_OG_IMAGE_ALT,
  DEFAULT_SHARE_TITLE,
  buildCommunityPostShareUrl,
  buildCommunityPostSocialMeta,
  isSocialCrawlerUserAgent,
} from "./communityPostSocialMeta";

describe("default share preview", () => {
  it("puts the GM eye slogan in the default title, alt, and image URL", () => {
    expect(DEFAULT_SHARE_TITLE).toBe(
      "Draft Day GM — Draft. Match up. Prove your GM eye.",
    );
    expect(DEFAULT_OG_IMAGE_ALT).toBe(
      "Draft Day GM — Draft. Match up. Prove your GM eye.",
    );
    expect(DEFAULT_OG_IMAGE).toBe("https://www.draftdaygm.com/og-share-v6.png");
  });
});

describe("communityPostSocialMeta", () => {
  it("builds a share URL with community post params", () => {
    expect(buildCommunityPostShareUrl("https://example.test", "post-123")).toBe(
      "https://example.test/?hub=community&view=posts&post=post-123",
    );
  });

  it("uses author tag in the title and body in the description", () => {
    const meta = buildCommunityPostSocialMeta(
      {
        id: "post-1",
        authorName: "Pat",
        authorTag: "PATGM",
        body: "This take aged well.",
        attachment: null,
      },
      "https://example.test/?hub=community&view=posts&post=post-1",
    );

    expect(meta.title).toBe("@PATGM · Draft Day GM");
    expect(meta.description).toBe("This take aged well.");
    expect(meta.url).toBe(
      "https://example.test/?hub=community&view=posts&post=post-1",
    );
  });

  it("describes matchup attachments in the preview text", () => {
    const meta = buildCommunityPostSocialMeta(
      {
        id: "post-2",
        authorName: "Pat",
        authorTag: "PATGM",
        body: "Close one.",
        attachment: {
          kind: "matchup",
          modeLabel: "Pro H2H",
          userTeam: "Foxes",
          opponentTeam: "Owls",
        },
      },
      "https://example.test/?post=post-2",
    );

    expect(meta.description).toBe("Pro H2H: Foxes vs Owls — Close one.");
  });

  it("detects common social crawler user agents", () => {
    expect(isSocialCrawlerUserAgent("facebookexternalhit/1.1")).toBe(true);
    expect(isSocialCrawlerUserAgent("Twitterbot/1.0")).toBe(true);
    expect(isSocialCrawlerUserAgent("Mozilla/5.0 Chrome/120")).toBe(false);
  });
});
