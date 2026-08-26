import { fetchAccountStatus } from "./accountApi";

const CACHE_TTL_MS = 60_000;
export const ACCOUNT_LINK_CHANGED_EVENT = "ddgm:account-link-changed";

type AccountLinkCache = {
  /** True only when the GM has a live authenticated session. */
  linked: boolean;
  /** Account exists for this playerId even if the session cookie is gone. */
  accountExists: boolean;
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

export const ACCOUNT_SESSION_EXPIRED_MESSAGE =
  "Session expired. Log in again to keep cloud sync and competitive play.";

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

const statusLooksAuthenticated = (status: {
  linked?: boolean;
  authenticated?: boolean;
  username?: string | null;
}) => {
  if (typeof status.authenticated === "boolean") {
    return status.authenticated;
  }
  // Older responses: username only comes back with a live session.
  return Boolean(status.linked && status.username);
};

/**
 * True when this GM has a live authenticated session (cookie present).
 * Linked-but-expired (password reset / cleared cookie) returns false so
 * write gates prompt sign-in instead of soft-failing with 401s.
 */
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

  const authenticated = statusLooksAuthenticated(result.status);
  const accountExists = Boolean(result.status.linked);
  linkCache.set(trimmed, {
    linked: authenticated,
    accountExists,
    username: authenticated ? (result.status.username ?? null) : null,
    checkedAt: Date.now(),
  });
  return authenticated;
};

export const markPlayerAccountLinked = (
  playerId: string,
  username: string | null,
  options: { linked?: boolean; accountExists?: boolean } = {},
) => {
  const trimmed = playerId.trim();
  if (!trimmed) {
    return;
  }

  const linked = options.linked ?? Boolean(username);
  linkCache.set(trimmed, {
    linked,
    accountExists: options.accountExists ?? linked,
    username: linked ? username : null,
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

/** True when an account exists for this GM but the session cookie is gone. */
export const peekCachedAccountNeedsRelogin = (
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

  return cached.accountExists && !cached.linked;
};

/**
 * Prefer "session expired / log in again" when we know an account exists for
 * this GM but the cookie is gone — otherwise the create-account copy.
 */
export const resolveAccountRequiredMessage = (
  playerId: string,
  createAccountMessage: string,
): string => {
  if (peekCachedAccountNeedsRelogin(playerId) === true) {
    return ACCOUNT_SESSION_EXPIRED_MESSAGE;
  }
  return createAccountMessage;
};
