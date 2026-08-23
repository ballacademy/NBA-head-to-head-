import { fetchAccountStatus } from "./accountApi";

const CACHE_TTL_MS = 60_000;
export const ACCOUNT_LINK_CHANGED_EVENT = "ddgm:account-link-changed";

type AccountLinkCache = {
  linked: boolean;
  username: string | null;
  checkedAt: number;
};

const linkCache = new Map<string, AccountLinkCache>();
const linkListeners = new Set<() => void>();

export const ACCOUNT_REQUIRED_LEADERBOARD_MESSAGE =
  "Create an account to appear on leaderboards.";

export const ACCOUNT_REQUIRED_TIER_PUBLISH_MESSAGE =
  "Create an account to publish tier lists.";

export const ACCOUNT_REQUIRED_PRIVATE_MATCH_MESSAGE =
  "Create an account to host or join a private match.";

export const ACCOUNT_REQUIRED_CHALLENGE_MESSAGE =
  "Create an account to challenge another GM.";

export const ACCOUNT_REQUIRED_COMMUNITY_POST_MESSAGE =
  "Create an account to post in Community.";

export const ACCOUNT_REQUIRED_TIER_LIST_COMMENT_DELETE_MESSAGE =
  "Create an account to delete comments.";

export const ACCOUNT_REQUIRED_COMMUNITY_ENGAGE_MESSAGE =
  "Sign in to post, reply, or like. Anyone can read.";

export const ACCOUNT_REQUIRED_COMMUNITY_LIKE_MESSAGE =
  "Create an account to like posts.";

export const ACCOUNT_REQUIRED_TIER_LIST_LIKE_MESSAGE =
  "Create an account to like tier lists.";

export const ACCOUNT_REQUIRED_COMMUNITY_REPLY_MESSAGE =
  "Create an account to reply.";

export const ACCOUNT_REQUIRED_TIER_LIST_COMMENT_MESSAGE =
  "Create an account to comment on tier lists.";

export const ACCOUNT_REQUIRED_TIER_LIST_REPORT_MESSAGE =
  "Create an account to report tier lists.";

export const ACCOUNT_REQUIRED_COMMUNITY_REPORT_MESSAGE =
  "Create an account to report posts.";

export const ACCOUNT_REQUIRED_EVENT_STANDINGS_MESSAGE =
  "Create an account to appear on event standings.";

const emitAccountLinkChanged = () => {
  for (const listener of [...linkListeners]) {
    listener();
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ACCOUNT_LINK_CHANGED_EVENT));
  }
};

export const subscribeAccountLinkChanged = (listener: () => void) => {
  linkListeners.add(listener);
  return () => {
    linkListeners.delete(listener);
  };
};

export const clearAccountLinkCache = (playerId?: string) => {
  if (playerId) {
    linkCache.delete(playerId);
  } else {
    linkCache.clear();
  }
  emitAccountLinkChanged();
};

export const isPlayerAccountLinked = async (
  playerId: string,
): Promise<boolean> => {
  const trimmed = playerId.trim();
  if (!trimmed) {
    return false;
  }

  const cached = linkCache.get(trimmed);
  if (cached && Date.now() - cached.checkedAt < CACHE_TTL_MS) {
    return cached.linked;
  }

  const result = await fetchAccountStatus(trimmed);
  if (!result.ok) {
    // Fail closed for competitive / public sharing writes.
    return false;
  }

  const linked = Boolean(result.status.linked);
  linkCache.set(trimmed, {
    linked,
    username: result.status.username ?? null,
    checkedAt: Date.now(),
  });
  return linked;
};

export const markPlayerAccountLinked = (
  playerId: string,
  username: string | null,
  options: { linked?: boolean } = {},
) => {
  const trimmed = playerId.trim();
  if (!trimmed) {
    return;
  }

  linkCache.set(trimmed, {
    linked: options.linked ?? Boolean(username),
    username,
    checkedAt: Date.now(),
  });
  emitAccountLinkChanged();
};

/** Sync username for leaderboard rows without an extra network round-trip. */
export const getCachedLinkedUsername = (playerId: string): string | null => {
  const trimmed = playerId.trim();
  if (!trimmed) {
    return null;
  }

  const cached = linkCache.get(trimmed);
  if (!cached?.linked || !cached.username) {
    return null;
  }

  return cached.username;
};

/** Fresh cache hit only — null means unknown / expired. */
export const peekCachedAccountLinked = (
  playerId: string,
): boolean | null => {
  const trimmed = playerId.trim();
  if (!trimmed) {
    return null;
  }

  const cached = linkCache.get(trimmed);
  if (!cached || Date.now() - cached.checkedAt >= CACHE_TTL_MS) {
    return null;
  }

  return cached.linked;
};
