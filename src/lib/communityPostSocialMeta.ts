export const DEFAULT_OG_IMAGE = "https://www.draftdaygm.com/og-share-v5.png";
export const DEFAULT_OG_IMAGE_ALT =
  "Draft Day GM — draft NBA lineups and compete head to head";
export const DEFAULT_SITE_NAME = "Draft Day GM";

export interface CommunityPostSocialMetaInput {
  id: string;
  authorName: string;
  authorTag: string;
  body: string;
  attachment?: unknown;
}

export interface SocialMetaTags {
  title: string;
  description: string;
  url: string;
  image: string;
  imageAlt: string;
  siteName: string;
}

const truncate = (value: string, max: number) => {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (trimmed.length <= max) {
    return trimmed;
  }
  return `${trimmed.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
};

const describeAttachment = (attachment: unknown): string | null => {
  if (!attachment || typeof attachment !== "object") {
    return null;
  }

  const entry = attachment as Record<string, unknown>;
  const kind = entry.kind;

  if (kind === "matchup") {
    const userTeam =
      typeof entry.userTeam === "string" ? entry.userTeam.trim() : "";
    const opponentTeam =
      typeof entry.opponentTeam === "string" ? entry.opponentTeam.trim() : "";
    const modeLabel =
      typeof entry.modeLabel === "string" ? entry.modeLabel.trim() : "";
    if (userTeam && opponentTeam) {
      return modeLabel
        ? `${modeLabel}: ${userTeam} vs ${opponentTeam}`
        : `${userTeam} vs ${opponentTeam}`;
    }
    return modeLabel || "Head-to-head result";
  }

  if (kind === "lineup") {
    const title = typeof entry.title === "string" ? entry.title.trim() : "";
    const modeLabel =
      typeof entry.modeLabel === "string" ? entry.modeLabel.trim() : "";
    if (title && modeLabel) {
      return `${title} · ${modeLabel}`;
    }
    return title || modeLabel || "Lineup share";
  }

  if (kind === "tierList") {
    const title = typeof entry.title === "string" ? entry.title.trim() : "";
    return title ? `Tier list: ${title}` : "Tier list share";
  }

  return null;
};

export const buildCommunityPostShareUrl = (
  origin: string,
  postId: string,
): string => {
  const url = new URL(origin);
  url.searchParams.set("hub", "community");
  url.searchParams.set("view", "posts");
  url.searchParams.set("post", postId.trim().slice(0, 80));
  return url.toString();
};

export const buildCommunityPostSocialMeta = (
  post: CommunityPostSocialMetaInput,
  pageUrl: string,
): SocialMetaTags => {
  const tag = post.authorTag.trim();
  const name = post.authorName.trim();
  const handle = tag ? `@${tag}` : name;
  const attachmentNote = describeAttachment(post.attachment);
  const bodyPreview = truncate(post.body, 160);
  const descriptionParts = [attachmentNote, bodyPreview].filter(
    (entry): entry is string => Boolean(entry),
  );
  const description =
    truncate(descriptionParts.join(" — "), 200) ||
    "Community post on Draft Day GM.";

  return {
    title: handle ? `${handle} · Draft Day GM` : "Community post · Draft Day GM",
    description,
    url: pageUrl,
    image: DEFAULT_OG_IMAGE,
    imageAlt: DEFAULT_OG_IMAGE_ALT,
    siteName: DEFAULT_SITE_NAME,
  };
};

export const SOCIAL_CRAWLER_PATTERNS = [
  /facebookexternalhit/i,
  /facebot/i,
  /twitterbot/i,
  /linkedinbot/i,
  /slackbot/i,
  /discordbot/i,
  /whatsapp/i,
  /telegrambot/i,
  /applebot/i,
  /embedly/i,
  /pinterest/i,
] as const;

export const isSocialCrawlerUserAgent = (userAgent: string) =>
  SOCIAL_CRAWLER_PATTERNS.some((pattern) => pattern.test(userAgent));
