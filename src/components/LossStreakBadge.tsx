import type { ReactNode } from "react";
import type { LossStreakTierId } from "../lib/lossStreak";
import { getLossStreakTier } from "../lib/lossStreak";

interface LossStreakBadgeProps {
  lossStreak: number;
}

const trashCanBody = (
  <>
    <path d="M8.5 8.5h7l-.6 10.2c-.1 1.2-1.1 2.1-2.3 2.1h-1.2c-1.2 0-2.2-.9-2.3-2.1L8.5 8.5Z" />
    <path d="M7 8.5h10l.5-2.2H6.5l.5 2.2Z" />
    <path d="M9.5 6.8h5l.4-1.5H9.1l.4 1.5Z" />
    <path d="M10.2 11.2v5.2M12 11.2v5.2M13.8 11.2v5.2" strokeWidth="0.9" />
  </>
);

const renderTierIcon = (tier: LossStreakTierId): ReactNode => {
  switch (tier) {
    case "orange":
      return (
        <>
          <path
            d="M11.2 2.8c.5 1.1 1.4 1.8 1.4 3.1 0 .7-.3 1.3-.8 1.7.6-.1 1.1-.6 1.3-1.2.2.9 1 1.7 2 2-1.1.6-2.4.6-3.5 0-1.2-.7-2-2-2-3.3 0-1.4.9-2.4 1.6-2.3Z"
            fill="#fb923c"
          />
          <g fill="#94a3b8" stroke="#64748b" strokeWidth="0.7">
            {trashCanBody}
          </g>
        </>
      );
    case "red":
      return (
        <>
          <path
            d="M6.2 3.2c.7 1.6 2 2.7 2 4.7 0 1-.5 1.9-1.2 2.4.9-.2 1.6-.9 1.9-1.8.2 1.1 1.1 2 2.2 2.4-1.3.7-2.8.7-4.1 0-1.4-.8-2.3-2.4-2.3-4 0-1.8 1.1-3 1.6-3.1Z"
            fill="#ef4444"
          />
          <path
            d="M16.2 3.8c.6 1.4 1.7 2.3 1.7 4.1 0 .9-.4 1.7-1 2.1.8-.2 1.5-.8 1.8-1.6.2 1 1 1.8 2 2.1-1.2.7-2.6.7-3.8 0-1.3-.8-2.1-2.2-2.1-3.8 0-1.7 1-2.8 1.4-2.9Z"
            fill="#f87171"
          />
          <g fill="#9ca3af" stroke="#6b7280" strokeWidth="0.7">
            {trashCanBody}
          </g>
        </>
      );
    case "blue":
      return (
        <>
          <circle cx="12" cy="12" r="10" fill="rgba(59,130,246,0.16)" />
          <path
            d="M12 2.4c1.1 2.2 3.2 3.7 3.2 6.5 0 1.5-.7 2.8-1.8 3.5 1.3-.3 2.4-1.3 2.9-2.6.3 2 1.8 3.7 3.7 4.3-2.2 1.2-4.8 1.2-7 0-2.4-1.4-3.9-4-3.9-6.8 0-3.1 2-5.3 2.4-5.4Z"
            fill="#3b82f6"
          />
          <path
            d="M12 8.8c.8 1.2 1.4 2.1 1.4 3.5 0 1-.5 1.9-1.2 2.4.8-.2 1.5-.8 1.8-1.6.2 1.1 1 2 2.1 2.4-1.2.6-2.6.6-3.8 0-1.3-.7-2.1-2.1-2.1-3.5 0-1.5.9-2.6 1.7-3.2Z"
            fill="#93c5fd"
          />
          <g fill="#cbd5e1" stroke="#64748b" strokeWidth="0.7">
            {trashCanBody}
          </g>
        </>
      );
    case "purple":
      return (
        <>
          <circle cx="12" cy="12" r="10.5" fill="rgba(168,85,247,0.16)" />
          <path
            d="M5.2 5.8c.8 2 2.2 3.3 2.2 5.6 0 1.2-.6 2.3-1.4 2.9 1-.2 1.8-1 2.1-2 .2 1.4 1.2 2.6 2.5 3.1-1.4.8-3 .8-4.4 0-1.5-.9-2.5-2.5-2.5-4.2 0-2.3 1.4-4.1 1.6-4.1Z"
            fill="#a855f7"
          />
          <path
            d="M18.2 6.4c.7 1.8 2 3 2 5.1 0 1.1-.5 2.1-1.2 2.6.8-.2 1.6-.9 1.9-1.8.2 1.3 1.1 2.3 2.2 2.8-1.2.7-2.7.7-3.9 0-1.4-.8-2.2-2.3-2.2-3.9 0-2.1 1.3-3.7 1.5-3.8Z"
            fill="#c084fc"
          />
          <path
            d="M12 3c1.3 2.6 3.7 4.3 3.7 7.6 0 1.7-.8 3.2-2.1 4 1.5-.3 2.8-1.5 3.4-3 .3 2.3 1.9 4.3 4.1 5.1-2.4 1.3-5.2 1.3-7.6 0-2.6-1.5-4.2-4.3-4.2-7.5 0-3.5 2.3-5.9 2.7-6.2Z"
            fill="#9333ea"
          />
          <g fill="#e9d5ff" stroke="#7c3aed" strokeWidth="0.7">
            {trashCanBody}
          </g>
        </>
      );
    case "black":
      return (
        <>
          <circle cx="12" cy="12" r="11" fill="rgba(255,255,255,0.04)" />
          <path
            d="M4.6 6.2c1 2.4 2.8 4 2.8 6.8 0 1.5-.8 2.9-1.9 3.6 1.3-.3 2.4-1.3 2.9-2.6.3 2 1.7 3.7 3.5 4.4-2 1.1-4.4 1.1-6.4 0-2.2-1.3-3.6-3.7-3.6-6.5 0-3.1 2-5.4 2.4-5.7Z"
            fill="#111827"
            stroke="#6b7280"
            strokeWidth="0.6"
          />
          <path
            d="M19 6.8c.8 2.1 2.4 3.5 2.4 6 0 1.3-.7 2.5-1.6 3.1 1-.2 1.9-1.1 2.2-2.2.2 1.5 1.4 2.9 2.9 3.4-1.7.9-3.8.9-5.5 0-1.9-1.1-3.1-3.2-3.1-5.7 0-2.7 1.6-4.7 1.9-4.8Z"
            fill="#1f2937"
            stroke="#9ca3af"
            strokeWidth="0.6"
          />
          <path
            d="M12 2.2c1.5 3 4.2 5 4.2 8.8 0 2-.9 3.7-2.4 4.6 1.7-.3 3.1-1.7 3.8-3.4.4 2.6 2.2 4.8 4.6 5.7-2.7 1.5-5.8 1.5-8.5 0-2.9-1.7-4.7-4.8-4.7-8.4 0-4 2.7-6.7 3.2-7.3Z"
            fill="#030712"
            stroke="#facc15"
            strokeWidth="0.75"
          />
          <g fill="#1f2937" stroke="#f8fafc" strokeWidth="0.65">
            {trashCanBody}
          </g>
        </>
      );
  }
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
