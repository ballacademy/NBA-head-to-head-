import {
  buildCommunityPostSocialMeta,
  type SocialMetaTags,
} from "../../src/lib/communityPostSocialMeta";

export { buildCommunityPostSocialMeta, isSocialCrawlerUserAgent } from "../../src/lib/communityPostSocialMeta";

const replaceOrInsertMeta = (
  html: string,
  attribute: "name" | "property",
  key: string,
  content: string,
) => {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `<meta\\s+${attribute}="${escapedKey}"\\s+content="[^"]*"\\s*/?>`,
    "i",
  );
  const replacement = `<meta ${attribute}="${key}" content="${content.replace(/"/g, "&quot;")}" />`;

  if (pattern.test(html)) {
    return html.replace(pattern, replacement);
  }

  return html.replace("</head>", `    ${replacement}\n  </head>`);
};

export const injectSocialMetaIntoHtml = (
  html: string,
  meta: SocialMetaTags,
): string => {
  let next = html.replace(
    /<title>[^<]*<\/title>/i,
    `<title>${meta.title.replace(/</g, "&lt;")}</title>`,
  );

  next = replaceOrInsertMeta(next, "name", "description", meta.description);
  next = replaceOrInsertMeta(next, "property", "og:site_name", meta.siteName);
  next = replaceOrInsertMeta(next, "property", "og:title", meta.title);
  next = replaceOrInsertMeta(
    next,
    "property",
    "og:description",
    meta.description,
  );
  next = replaceOrInsertMeta(next, "property", "og:url", meta.url);
  next = replaceOrInsertMeta(next, "property", "og:image", meta.image);
  next = replaceOrInsertMeta(next, "property", "og:image:alt", meta.imageAlt);
  next = replaceOrInsertMeta(next, "name", "twitter:title", meta.title);
  next = replaceOrInsertMeta(
    next,
    "name",
    "twitter:description",
    meta.description,
  );
  next = replaceOrInsertMeta(next, "name", "twitter:image", meta.image);

  const canonicalPattern =
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i;
  const canonicalReplacement = `<link rel="canonical" href="${meta.url.replace(/"/g, "&quot;")}" />`;
  if (canonicalPattern.test(next)) {
    next = next.replace(canonicalPattern, canonicalReplacement);
  }

  return next;
};

export const fetchCommunityPostForSocialMeta = async (
  db: D1Database,
  postId: string,
) => {
  const row = await db
    .prepare(
      `SELECT id, author_name, author_tag, body, attachment_json
       FROM community_posts
       WHERE id = ?
       LIMIT 1`,
    )
    .bind(postId)
    .first<{
      id: string;
      author_name: string;
      author_tag: string;
      body: string;
      attachment_json: string | null;
    }>();

  if (!row) {
    return null;
  }

  let attachment: unknown = null;
  if (row.attachment_json) {
    try {
      attachment = JSON.parse(row.attachment_json);
    } catch {
      attachment = null;
    }
  }

  return {
    id: row.id,
    authorName: row.author_name,
    authorTag: row.author_tag,
    body: row.body,
    attachment,
  };
};

export const buildCommunityPostSocialMetaFromRow = (
  row: {
    id: string;
    authorName: string;
    authorTag: string;
    body: string;
    attachment: unknown;
  },
  pageUrl: string,
) =>
  buildCommunityPostSocialMeta(
    {
      id: row.id,
      authorName: row.authorName,
      authorTag: row.authorTag,
      body: row.body,
      attachment: row.attachment,
    },
    pageUrl,
  );
