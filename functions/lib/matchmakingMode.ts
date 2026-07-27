import type { MatchmakingMode } from "../types";

export const parseMatchmakingMode = (
  value: unknown,
): MatchmakingMode | null =>
  value === "classic" || value === "ranked" || value === "event"
    ? value
    : null;

export const matchmakingModeError = () =>
  "mode must be classic, ranked, or event";
