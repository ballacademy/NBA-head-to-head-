export type LossStreakTierId = "orange" | "red" | "blue" | "purple" | "black";

export interface LossStreakTier {
  id: LossStreakTierId;
  minStreak: number;
  label: string;
}

export const LOSS_STREAK_TIERS: readonly LossStreakTier[] = [
  { id: "black", minStreak: 20, label: "Dumpster fire" },
  { id: "purple", minStreak: 15, label: "Toxic slump" },
  { id: "blue", minStreak: 10, label: "Ice-cold skid" },
  { id: "red", minStreak: 5, label: "Rough stretch" },
  { id: "orange", minStreak: 3, label: "Losing streak" },
];

export const LOSS_STREAK_BADGE_THRESHOLD = 3;

export const getLossStreakTier = (lossStreak: number): LossStreakTier | null =>
  LOSS_STREAK_TIERS.find((tier) => lossStreak >= tier.minStreak) ?? null;

export const hasLossStreakBadge = (lossStreak: number) =>
  lossStreak >= LOSS_STREAK_BADGE_THRESHOLD;
