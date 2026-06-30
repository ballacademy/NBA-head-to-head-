import type { LossStreakTierId } from "../lib/lossStreak";
import type { WinStreakTierId } from "../lib/winStreak";

interface WinStreakIconProps {
  tier: WinStreakTierId;
  className?: string;
}

interface LossStreakIconProps {
  tier: LossStreakTierId;
  className?: string;
}

export function WinStreakIcon({ tier, className }: WinStreakIconProps) {
  return (
    <svg
      className={["streak-icon streak-icon--win", className].filter(Boolean).join(" ")}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        className="streak-icon__flame streak-icon__flame--outer"
        d="M12 22c-4.4-4-6.2-7.8-6.2-11.5 0-3.2 1.9-5.8 4.7-6.9.7 1.6 1.9 2.6 3.3 2.6s2.6-1 3.3-2.6c2.8 1.1 4.7 3.7 4.7 6.9 0 3.7-1.8 7.5-6.2 11.5Z"
      />
      <path
        className="streak-icon__flame streak-icon__flame--inner"
        d="M12 19.1c-2.3-2.1-3.3-4.6-3.3-7 0-2.1 1.1-3.8 2.8-4.7.5 1 1.3 1.7 2.3 1.7s1.8-.7 2.3-1.7c1.7.9 2.8 2.6 2.8 4.7 0 2.4-1 4.9-3.3 7Z"
      />
      <path
        className="streak-icon__flame streak-icon__flame--core"
        d="M12 16.2c-1.3-1.2-1.9-2.7-1.9-4.1 0-1.2.6-2.2 1.6-2.8.3.6.8 1 1.4 1s1.1-.4 1.4-1c1 .6 1.6 1.6 1.6 2.8 0 1.4-.6 2.9-1.9 4.1Z"
      />
      {tier === "blue" ? (
        <path
          className="streak-icon__bolt"
          d="m13.1 7.8-2.4 5.4h2.1l-1.3 3.8 3.8-5.6h-2.2l.1-3.6Z"
        />
      ) : null}
      {tier === "black" ? (
        <path
          className="streak-icon__crown"
          d="M7.8 5.4 10.1 8l1.9-2.3 1.9 2.3 2.3-2.6L17.6 7l-1 1.4H7.4L6.4 7Z"
        />
      ) : null}
    </svg>
  );
}

export function LossStreakIcon({ tier, className }: LossStreakIconProps) {
  return (
    <svg
      className={["streak-icon streak-icon--loss", className].filter(Boolean).join(" ")}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        className="streak-icon__bin"
        d="M8.2 10.2h7.6l-.8 10.4a1.9 1.9 0 0 1-1.9 1.7H10.9a1.9 1.9 0 0 1-1.9-1.7l-.8-10.4Z"
      />
      <path className="streak-icon__bin-lid" d="M7.2 9.4h9.6l-.9-2.1H8.1l-.9 2.1Z" />
      <path className="streak-icon__bin-rim" d="M9.4 7.3h5.2" />
      <path
        className="streak-icon__flame streak-icon__flame--left"
        d="M10.1 9.8c-.9 1.4-1 2.8-.3 3.9.4-.8 1-1.3 1.6-1.3.4 0 .7.2 1 .5-.3-1.3-.1-2.5.5-3.5-.7.3-1.3 0-1.8-.4Z"
      />
      <path
        className="streak-icon__flame streak-icon__flame--center"
        d="M12 8.2c-1.1 1.9-1.2 3.8-.1 5.3.6-.8 1.3-1.3 2.1-1.3s1.5.5 2.1 1.3c1.1-1.5 1-3.4-.1-5.3-1 .4-2 .4-3 0Z"
      />
      <path
        className="streak-icon__flame streak-icon__flame--right"
        d="M13.9 9.8c.7-.4 1.3 0 1.8.4.6 1 .8 2.2.5 3.5.3-.3.6-.5 1-.5.6 0 1.2.5 1.6 1.3.7-1.1.6-2.5-.3-3.9Z"
      />
      {tier === "black" ? (
        <>
          <path className="streak-icon__smoke" d="M8.6 6.1c.3-.7.8-.7 1.1 0" />
          <path className="streak-icon__smoke" d="M12 5.1c.3-.8.8-.8 1.1 0" />
          <path className="streak-icon__smoke" d="M15.4 6.1c.3-.7.8-.7 1.1 0" />
        </>
      ) : null}
    </svg>
  );
}
