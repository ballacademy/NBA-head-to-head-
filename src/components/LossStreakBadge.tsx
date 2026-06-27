import type { ReactNode } from "react";
import type { LossStreakTierId } from "../lib/lossStreak";
import { getLossStreakTier } from "../lib/lossStreak";

interface LossStreakBadgeProps {
  lossStreak: number;
}

const FLAME_COLORS: Record<
  LossStreakTierId,
  { primary: string; secondary: string; accent: string; glow: string }
> = {
  orange: {
    primary: "rgba(251, 146, 60, 0.82)",
    secondary: "rgba(253, 186, 116, 0.72)",
    accent: "rgba(254, 215, 170, 0.65)",
    glow: "rgba(251, 146, 60, 0.42)",
  },
  red: {
    primary: "rgba(239, 68, 68, 0.84)",
    secondary: "rgba(248, 113, 113, 0.74)",
    accent: "rgba(254, 202, 202, 0.68)",
    glow: "rgba(239, 68, 68, 0.45)",
  },
  blue: {
    primary: "rgba(59, 130, 246, 0.82)",
    secondary: "rgba(96, 165, 250, 0.72)",
    accent: "rgba(191, 219, 254, 0.68)",
    glow: "rgba(59, 130, 246, 0.45)",
  },
  purple: {
    primary: "rgba(168, 85, 247, 0.84)",
    secondary: "rgba(192, 132, 252, 0.74)",
    accent: "rgba(233, 213, 255, 0.68)",
    glow: "rgba(168, 85, 247, 0.48)",
  },
  black: {
    primary: "rgba(248, 250, 252, 0.78)",
    secondary: "rgba(250, 204, 21, 0.72)",
    accent: "rgba(254, 240, 138, 0.66)",
    glow: "rgba(250, 204, 21, 0.38)",
  },
};

const renderFlames = (tier: LossStreakTierId): ReactNode => {
  const colors = FLAME_COLORS[tier];

  return (
    <g className="loss-streak-badge__flames">
      <path
        d="M6.5 11.5c1.2-2.4 2.8-3.4 2.8-5.2 0 .8-.4 1.5-1 2 .7-.2 1.3-.8 1.5-1.5.2 1 1 1.8 2 2.1-1.2.6-2.6.6-3.8 0Z"
        fill={colors.secondary}
      />
      <path
        d="M17.5 12c1-2.2 2.4-3.1 2.4-4.8 0 .7-.3 1.3-.8 1.7.6-.2 1.1-.7 1.3-1.3.2.9 1 1.6 1.9 1.9-1.1.6-2.4.6-3.5 0Z"
        fill={colors.secondary}
      />
      <path
        d="M9.5 8.5c.8-1.8 2-2.8 2-4.2 0 .7-.3 1.2-.8 1.6.6-.1 1.1-.6 1.3-1.2.2.9.9 1.6 1.8 1.9-1 .6-2.2.6-3.2 0Z"
        fill={colors.primary}
      />
      <path
        d="M12 6.8c1 2.1 2.8 3.4 2.8 5.8 0 1.3-.6 2.4-1.5 3 .9-.2 1.7-.9 2-1.8.2 1.2 1.1 2.2 2.3 2.6-1.3.7-2.8.7-4.1 0-1.4-.8-2.3-2.4-2.3-4 0-1.7 1-2.9 1.7-3.6Z"
        fill={colors.primary}
      />
      <path
        d="M14.5 8.8c.7-1.6 1.8-2.5 1.8-3.8 0 .6-.3 1.1-.7 1.4.5-.1 1-.5 1.2-1 .2.8.8 1.4 1.6 1.7-.9.5-2 .5-2.9 0Z"
        fill={colors.primary}
      />
      <path
        d="M11 9.8c.5 1.1 1.1 1.9 1.1 3.1 0 .9-.4 1.6-1 2 .7-.2 1.3-.7 1.5-1.4.2.9.9 1.7 1.9 2-1.1.6-2.4.6-3.5 0-1.2-.7-2-1.9-2-3.1 0-1.3.8-2.2 1.5-2.6Z"
        fill={colors.accent}
      />
    </g>
  );
};

const renderTrashCan = (tier: LossStreakTierId): ReactNode => {
  const bodyFill =
    tier === "black"
      ? "rgba(15, 23, 42, 0.82)"
      : "rgba(100, 116, 139, 0.72)";
  const bodyStroke =
    tier === "black" ? "rgba(248, 250, 252, 0.72)" : "rgba(71, 85, 105, 0.82)";
  const lidFill =
    tier === "black"
      ? "rgba(30, 41, 59, 0.84)"
      : "rgba(148, 163, 184, 0.78)";

  return (
    <g className="loss-streak-badge__can">
      <rect
        x="7.2"
        y="12.8"
        width="9.6"
        height="1.8"
        rx="0.5"
        fill={lidFill}
        stroke={bodyStroke}
        strokeWidth="0.55"
      />
      <path
        d="M10.2 12.8V10.8M13.8 12.8V10.8M10.2 10.8H13.8"
        stroke={bodyStroke}
        strokeWidth="0.9"
        strokeLinecap="round"
      />
      <path
        d="M8.4 14.6h7.2l-.75 7.8c-.08.95-.95 1.7-2 1.7h-1.7c-1.05 0-1.92-.75-2-1.7L8.4 14.6Z"
        fill={bodyFill}
        stroke={bodyStroke}
        strokeWidth="0.7"
      />
      <path
        d="M10.3 16.2v5.2M12 16.2v5.2M13.7 16.2v5.2"
        stroke={bodyStroke}
        strokeWidth="0.75"
        strokeLinecap="round"
        opacity="0.85"
      />
      <ellipse
        cx="12"
        cy="14.7"
        rx="4.1"
        ry="0.55"
        fill="rgba(15, 23, 42, 0.35)"
      />
    </g>
  );
};

const renderTierIcon = (tier: LossStreakTierId): ReactNode => {
  const colors = FLAME_COLORS[tier];

  return (
    <>
      <circle
        cx="12"
        cy="13"
        r="10"
        fill={colors.glow}
        opacity="0.35"
      />
      {renderFlames(tier)}
      {renderTrashCan(tier)}
    </>
  );
};

export function LossStreakBadge({ lossStreak }: LossStreakBadgeProps) {
  const tier = getLossStreakTier(lossStreak);

  if (!tier) {
    return null;
  }

  return (
    <span
      className={`loss-streak-badge loss-streak-badge--${tier.id}`}
      aria-label={`${lossStreak} game ${tier.label.toLowerCase()}`}
      title={`${lossStreak} game ${tier.label.toLowerCase()}`}
    >
      <svg
        className="loss-streak-badge__icon"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        {renderTierIcon(tier.id)}
      </svg>
    </span>
  );
}
