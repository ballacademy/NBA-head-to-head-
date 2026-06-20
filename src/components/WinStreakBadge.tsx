import type { ReactNode } from "react";
import type { WinStreakTierId } from "../lib/winStreak";
import { getWinStreakTier } from "../lib/winStreak";

interface WinStreakBadgeProps {
  winStreak: number;
}

const renderTierIcon = (tier: WinStreakTierId): ReactNode => {
  switch (tier) {
    case "orange":
      return (
        <>
          <path
            d="M12 3.5c1.2 2.4 3.4 4 3.4 7.1 0 1.6-.8 3-2 3.8 1.4-.3 2.6-1.4 3.1-2.8.3 2.1 1.8 3.9 3.8 4.6-2.2 1.2-4.8 1.2-7 0-2.4-1.4-3.9-4-3.9-7 0-3.4 2.2-5.8 2.6-5.7Z"
            fill="#fb923c"
          />
          <path
            d="M12 9.8c.8 1.2 1.5 2.1 1.5 3.5 0 1-.5 1.9-1.2 2.4.8-.2 1.5-.8 1.8-1.6.2 1.1 1 2 2.1 2.4-1.2.6-2.6.6-3.8 0-1.3-.7-2.1-2.1-2.1-3.5 0-1.5.9-2.6 1.7-3.2Z"
            fill="#fdba74"
          />
        </>
      );
    case "red":
      return (
        <>
          <path
            d="M6.5 5c1 2.2 2.8 3.6 2.8 6.2 0 1.4-.7 2.6-1.7 3.3 1.2-.3 2.2-1.2 2.6-2.4.3 1.8 1.5 3.4 3.2 4-1.8 1-4 1-5.8 0-2-1.2-3.2-3.5-3.2-6.1 0-2.9 1.8-5 2.1-4.9Z"
            fill="#ef4444"
          />
          <path
            d="M17.5 6c.9 2 2.5 3.3 2.5 5.8 0 1.3-.6 2.4-1.5 3 1-.2 1.9-1.1 2.3-2.2.2 1.6 1.3 3.1 2.8 3.6-1.6.9-3.6.9-5.2 0-1.8-1.1-2.8-3.2-2.8-5.6 0-2.6 1.6-4.5 1.9-4.6Z"
            fill="#f87171"
          />
          <path
            d="M12 10.5c.9 1.3 1.7 2.3 1.7 3.8 0 1.1-.6 2.1-1.4 2.6.9-.2 1.7-.9 2-1.8.2 1.2 1.1 2.2 2.3 2.6-1.3.7-2.8.7-4.1 0-1.4-.8-2.3-2.3-2.3-3.8 0-1.6 1-2.8 1.8-3.4Z"
            fill="#fecaca"
          />
        </>
      );
    case "blue":
      return (
        <>
          <circle cx="12" cy="12" r="10" fill="rgba(59,130,246,0.18)" />
          <path
            d="M12 2.8c1.4 2.8 4 4.6 4 8.1 0 1.8-.9 3.4-2.3 4.2 1.6-.3 3-1.6 3.6-3.2.4 2.5 2.1 4.6 4.4 5.4-2.6 1.4-5.6 1.4-8.2 0-2.8-1.6-4.6-4.6-4.6-8 0-3.8 2.5-6.4 3.1-6.5Z"
            fill="#3b82f6"
          />
          <path
            d="M12 10.2c1 1.5 1.8 2.6 1.8 4.3 0 1.2-.6 2.3-1.5 2.9 1-.2 1.9-1 2.2-2 .3 1.3 1.3 2.4 2.7 2.9-1.5.8-3.2.8-4.7 0-1.6-.9-2.6-2.6-2.6-4.3 0-1.8 1.1-3.1 2.1-3.8Z"
            fill="#93c5fd"
          />
          <circle cx="6.5" cy="7.5" r="1.1" fill="#dbeafe" />
          <circle cx="17.5" cy="8" r="0.9" fill="#dbeafe" />
          <path
            d="M5 14.5 6.2 15.2 5.4 16.2"
            stroke="#bfdbfe"
            strokeWidth="0.8"
            fill="none"
          />
        </>
      );
    case "purple":
      return (
        <>
          <circle cx="12" cy="12" r="10.5" fill="rgba(168,85,247,0.16)" />
          <circle
            cx="12"
            cy="12"
            r="7.5"
            fill="none"
            stroke="rgba(233,213,255,0.45)"
            strokeWidth="0.8"
          />
          <path
            d="M5.5 6.2c.8 2 2.3 3.3 2.3 5.6 0 1.2-.6 2.3-1.4 2.9 1-.2 1.8-1 2.1-2 .2 1.4 1.2 2.6 2.5 3.1-1.4.8-3 .8-4.4 0-1.5-.9-2.5-2.5-2.5-4.2 0-2.3 1.4-4.1 1.6-4.1Z"
            fill="#a855f7"
          />
          <path
            d="M18.5 6.8c.7 1.8 2 3 2 5.1 0 1.1-.5 2.1-1.2 2.6.8-.2 1.6-.9 1.9-1.8.2 1.3 1.1 2.3 2.2 2.8-1.2.7-2.7.7-3.9 0-1.4-.8-2.2-2.3-2.2-3.9 0-2.1 1.3-3.7 1.5-3.8Z"
            fill="#c084fc"
          />
          <path
            d="M12 3.2c1.3 2.6 3.7 4.3 3.7 7.6 0 1.7-.8 3.2-2.1 4 1.5-.3 2.8-1.5 3.4-3 .3 2.3 1.9 4.3 4.1 5.1-2.4 1.3-5.2 1.3-7.6 0-2.6-1.5-4.2-4.3-4.2-7.5 0-3.5 2.3-5.9 2.7-6.2Z"
            fill="#9333ea"
          />
          <path
            d="M12 10.8c.9 1.4 1.6 2.4 1.6 4 0 1.1-.5 2.1-1.3 2.6.8-.2 1.6-.9 1.9-1.8.2 1.2 1.1 2.2 2.3 2.6-1.3.7-2.8.7-4.1 0-1.4-.8-2.3-2.4-2.3-4 0-1.7 1-2.9 1.9-3.6Z"
            fill="#f3e8ff"
          />
          <path
            d="M12 1.8v2.2M12 20v2.2M1.8 12h2.2M20 12h2.2"
            stroke="#e9d5ff"
            strokeWidth="0.7"
            strokeLinecap="round"
          />
        </>
      );
    case "black":
      return (
        <>
          <circle cx="12" cy="12" r="11" fill="rgba(255,255,255,0.05)" />
          <circle
            cx="12"
            cy="12"
            r="9.5"
            fill="none"
            stroke="rgba(248,250,252,0.28)"
            strokeWidth="0.9"
          />
          <circle
            cx="12"
            cy="12"
            r="7"
            fill="none"
            stroke="rgba(250,204,21,0.55)"
            strokeWidth="0.7"
          />
          <path
            d="M4.8 6.5c1 2.4 2.9 4 2.9 6.8 0 1.5-.8 2.9-1.9 3.6 1.3-.3 2.4-1.3 2.9-2.6.3 2 1.7 3.7 3.5 4.4-2 1.1-4.4 1.1-6.4 0-2.2-1.3-3.6-3.7-3.6-6.5 0-3.1 2-5.4 2.4-5.7Z"
            fill="#111827"
            stroke="#6b7280"
            strokeWidth="0.6"
          />
          <path
            d="M19.2 7.2c.8 2.1 2.4 3.5 2.4 6 0 1.3-.7 2.5-1.6 3.1 1-.2 1.9-1.1 2.2-2.2.2 1.5 1.4 2.9 2.9 3.4-1.7.9-3.8.9-5.5 0-1.9-1.1-3.1-3.2-3.1-5.7 0-2.7 1.6-4.7 1.9-4.8Z"
            fill="#1f2937"
            stroke="#9ca3af"
            strokeWidth="0.6"
          />
          <path
            d="M12 2.5c1.5 3 4.2 5 4.2 8.8 0 2-.9 3.7-2.4 4.6 1.7-.3 3.1-1.7 3.8-3.4.4 2.6 2.2 4.8 4.6 5.7-2.7 1.5-5.8 1.5-8.5 0-2.9-1.7-4.7-4.8-4.7-8.4 0-4 2.7-6.7 3.2-7.3Z"
            fill="#030712"
            stroke="#f8fafc"
            strokeWidth="0.75"
          />
          <path
            d="M12 10.5c1 1.5 1.8 2.7 1.8 4.4 0 1.2-.6 2.2-1.5 2.8.9-.2 1.7-.9 2-1.9.2 1.3 1.2 2.3 2.5 2.8-1.4.8-3 .8-4.4 0-1.5-.9-2.5-2.6-2.5-4.3 0-1.8 1.1-3.1 2.1-3.8Z"
            fill="#facc15"
          />
          <circle cx="6" cy="7" r="1" fill="#f8fafc" />
          <circle cx="18" cy="7.5" r="0.8" fill="#f8fafc" />
          <path
            d="M4.5 15.5 5.8 16.4 5 17.5M19.5 15 18.4 16.1 19.3 17.2"
            stroke="#e5e7eb"
            strokeWidth="0.7"
            fill="none"
            strokeLinecap="round"
          />
        </>
      );
  }
};

export function WinStreakBadge({ winStreak }: WinStreakBadgeProps) {
  const tier = getWinStreakTier(winStreak);

  if (!tier) {
    return null;
  }

  return (
    <span
      className={`win-streak-badge win-streak-badge--${tier.id}`}
      aria-label={`${winStreak} game ${tier.label.toLowerCase()}`}
      title={`${winStreak} game ${tier.label.toLowerCase()}`}
    >
      {tier.id === "orange" ? (
        <span className="win-streak-badge__emoji" aria-hidden="true">
          🔥
        </span>
      ) : (
        <svg
          className="win-streak-badge__icon"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          {renderTierIcon(tier.id)}
        </svg>
      )}
    </span>
  );
}
