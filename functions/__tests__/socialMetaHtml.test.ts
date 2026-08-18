import { describe, expect, it } from "vitest";
import { injectSocialMetaIntoHtml } from "../lib/socialMetaHtml";
import { buildCommunityPostSocialMeta } from "../../src/lib/communityPostSocialMeta";

const SAMPLE_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="description" content="Default description" />
    <title>Draft Day GM</title>
    <link rel="canonical" href="https://www.draftdaygm.com/" />
    <meta property="og:title" content="Draft Day GM" />
    <meta property="og:description" content="Default OG description" />
    <meta property="og:url" content="https://www.draftdaygm.com/" />
    <meta property="og:image" content="https://www.draftdaygm.com/og-share-v5.png" />
    <meta name="twitter:title" content="Draft Day GM" />
    <meta name="twitter:description" content="Default Twitter description" />
    <meta name="twitter:image" content="https://www.draftdaygm.com/og-share-v5.png" />
  </head>
  <body></body>
</html>`;

describe("socialMetaHtml", () => {
  it("replaces title and OG tags for a community post", () => {
    const meta = buildCommunityPostSocialMeta(
      {
        id: "post-1",
        authorName: "Pat",
        authorTag: "PATGM",
        body: "Big win tonight.",
        attachment: null,
      },
      "https://www.draftdaygm.com/?hub=community&view=posts&post=post-1",
    );

    const html = injectSocialMetaIntoHtml(SAMPLE_HTML, meta);

    expect(html).toContain("<title>@PATGM · Draft Day GM</title>");
    expect(html).toContain(
      'property="og:url" content="https://www.draftdaygm.com/?hub=community&view=posts&post=post-1"',
    );
    expect(html).toContain('property="og:description" content="Big win tonight."');
  });
});
