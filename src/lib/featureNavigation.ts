/** History state pushed when opening hub feature pages from game phases. */
export type FeatureHistoryState = {
  appPhase?: string;
  returnTo?: string;
};

export const GAME_RETURN_PHASES = new Set([
  "results",
  "drafting",
  "waiting",
]);

export const readFeatureHistoryState = (): FeatureHistoryState | null => {
  if (typeof window === "undefined") {
    return null;
  }
  return (window.history.state as FeatureHistoryState | null) ?? null;
};

export const isGameReturnPhase = (phase: string | undefined): boolean =>
  Boolean(phase && GAME_RETURN_PHASES.has(phase));
