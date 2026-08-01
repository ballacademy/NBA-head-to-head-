import { fetchAccountStatus } from "./accountApi";

const CACHE_TTL_MS = 60_000;

type AccountLinkCache = {
  linked: boolean;
  username: string | null;
  checkedAt: number;
};

const linkCache = new Map<string, AccountLinkCache>();

export const ACCOUNT_REQUIRED_LEADERBOARD_MESSAGE =
  "Create an account to appear on leaderboards.";

export const ACCOUNT_REQUIRED_TIER_PUBLISH_MESSAGE =
  "Create an account to publish tier lists.";

export const clearAccountLinkCache = (playerId?: string) => {
  if (playerId) {
    linkCache.delete(playerId);
    return;
  }
  linkCache.clear();
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

  const linked = Boolean(result.status.linked && result.status.username);
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
) => {
  const trimmed = playerId.trim();
  if (!trimmed) {
    return;
  }

  linkCache.set(trimmed, {
    linked: Boolean(username),
    username,
    checkedAt: Date.now(),
  });
};
