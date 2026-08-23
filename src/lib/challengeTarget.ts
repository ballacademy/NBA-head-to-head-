/** GM targeted by Challenge from Community / Ranks / results. */
export interface ChallengeTarget {
  playerId: string;
  displayName?: string;
}

export type ChallengeGmHandler = (
  mode: "classic" | "ranked",
  target?: ChallengeTarget | null,
) => void;
