/** Best-effort warmup for lazy hub pages. Failures are ignored (stale chunks). */

export type HubPrefetchTab =
  | "play"
  | "roster"
  | "community"
  | "standings"
  | "account";

const prefetch = (loader: () => Promise<unknown>) => {
  void loader().catch(() => undefined);
};

export const prefetchHubFeatureTab = (tab: HubPrefetchTab) => {
  if (tab === "standings") {
    prefetch(() => import("../components/LeaderboardPage"));
    return;
  }
  if (tab === "community") {
    prefetch(() => import("../components/TierListPage"));
    return;
  }
  if (tab === "roster") {
    prefetch(() => import("../components/PlayerStatsTable"));
    prefetch(() => import("../components/AchievementsPage"));
    prefetch(() => import("../components/GmStatsPage"));
    prefetch(() => import("../components/WeeklyRecapPage"));
    return;
  }
  if (tab === "account") {
    prefetch(() => import("../components/LegalPage"));
    prefetch(() => import("../components/BetaNotesPage"));
  }
};

export const prefetchAllHubFeatureChunks = () => {
  prefetchHubFeatureTab("standings");
  prefetchHubFeatureTab("community");
  prefetchHubFeatureTab("roster");
  prefetchHubFeatureTab("account");
};

export const prefetchFeaturePhase = (phase: string) => {
  switch (phase) {
    case "leaderboard":
      prefetchHubFeatureTab("standings");
      return;
    case "tierList":
      prefetchHubFeatureTab("community");
      return;
    case "stats":
    case "achievements":
    case "gmStats":
    case "gameLog":
    case "weeklyRecap":
      prefetchHubFeatureTab("roster");
      return;
    case "privacy":
    case "terms":
    case "beta":
      prefetchHubFeatureTab("account");
      return;
    default:
      break;
  }
};

export const scheduleIdleHubPrefetch = (): (() => void) => {
  const run = () => prefetchAllHubFeatureChunks();
  const idleHost = globalThis as typeof globalThis & {
    requestIdleCallback?: (
      callback: () => void,
      options?: { timeout: number },
    ) => number;
    cancelIdleCallback?: (id: number) => void;
  };

  if (typeof idleHost.requestIdleCallback === "function") {
    const id = idleHost.requestIdleCallback(run, { timeout: 1500 });
    return () => idleHost.cancelIdleCallback?.(id);
  }

  const timeoutId = globalThis.setTimeout(run, 400);
  return () => globalThis.clearTimeout(timeoutId);
};
