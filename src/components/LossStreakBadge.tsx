import { getLossStreakTier } from "../lib/lossStreak";
import { LossStreakIcon } from "./StreakIcons";

interface LossStreakBadgeProps {
  lossStreak: number;
  showTypeLabel?: boolean;
  layout?: "default" | "inline";
}

export function LossStreakBadge({
  lossStreak,
  showTypeLabel = true,
  layout = "default",
}: LossStreakBadgeProps) {
  const tier = getLossStreakTier(lossStreak);

  if (!tier) {
    return null;
  }

  const description = `${lossStreak}-game loss streak`;

  const icon = (
    <LossStreakIcon
      tier={tier.id}
      className="streak-badge__icon loss-streak-badge__icon"
    />
  );
  const metric = (
    <span className="streak-badge__metric">
      <span className="streak-badge__count">{lossStreak}</span>
      {showTypeLabel ? (
        <span className="streak-badge__type" aria-hidden="true">
          L
        </span>
      ) : null}
    </span>
  );

  return (
    <span
      className={[
        "streak-badge",
        "loss-streak-badge",
        `loss-streak-badge--${tier.id}`,
        layout === "inline" ? "streak-badge--inline" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={description}
      title={description}
    >
      {layout === "inline" ? (
        <>
          {icon}
          {metric}
        </>
      ) : (
        <>
          {metric}
          {icon}
        </>
      )}
    </span>
  );
}
