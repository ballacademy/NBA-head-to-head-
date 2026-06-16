export type WinStreakTierId = "orange" | "red" | "blue" | "purple" | "black";

export interface WinStreakTier {
  id: WinStreakTierId;
  minStreak: number;
  label: string;
}

export const WIN_STREAK_TIERS: readonly WinStreakTier[] = [
  { id: "black", minStreak: 20, label: "Legendary streak" },
  { id: "purple", minStreak: 15, label: "Epic streak" },
  { id: "blue", minStreak: 10, label: "Blazing streak" },
  { id: "red", minStreak: 5, label: "Hot streak" },
  { id: "orange", minStreak: 3, label: "Win streak" },
];

export const WIN_STREAK_FIRE_THRESHOLD = 3;

export const getWinStreakTier = (winStreak: number): WinStreakTier | null =>
  WIN_STREAK_TIERS.find((tier) => winStreak >= tier.minStreak) ?? null;

export const hasFireStreak = (winStreak: number) =>
  winStreak >= WIN_STREAK_FIRE_THRESHOLD;
