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
        d="M12 21.5c-3.8-3.5-5.6-6.9-5.6-10.3 0-2.9 1.7-5.2 4.2-6.2.6 1.4 1.7 2.3 3 2.3s2.4-.9 3-2.3c2.5 1 4.2 3.3 4.2 6.2 0 3.4-1.8 6.8-5.8 10.3Z"
      />
      <path
        className="streak-icon__flame streak-icon__flame--inner"
        d="M12 18.6c-2-1.8-2.9-4-2.9-6.2 0-1.9 1-3.4 2.5-4.2.4.9 1.1 1.5 2 1.5s1.6-.6 2-1.5c1.5.8 2.5 2.3 2.5 4.2 0 2.2-.9 4.4-2.9 6.2Z"
      />
      <path
        className="streak-icon__flame streak-icon__flame--core"
        d="M12 15.8c-1.1-1-1.7-2.3-1.7-3.5 0-1 .5-1.9 1.4-2.4.3.5.7.9 1.3.9s1-.4 1.3-.9c.9.5 1.4 1.4 1.4 2.4 0 1.2-.6 2.5-1.7 3.5Z"
      />
      {tier === "blue" ? (
        <path
          className="streak-icon__bolt"
          d="M13.2 7.4 10.6 13h2.2l-1.4 4.1 4.1-6h-2.3l.1-3.7Z"
        />
      ) : null}
      {tier === "black" ? (
        <path
          className="streak-icon__crown"
          d="M7.5 5.8 9.8 8.3l2-2.4 2 2.4 2.4-2.8L17.4 7.2l-1 1.5H7.6L6.6 7.2Z"
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
        d="M8.4 10.4h7.2l-.8 10.1a1.8 1.8 0 0 1-1.8 1.6H11a1.8 1.8 0 0 1-1.8-1.6l-.8-10.1Z"
      />
      <path className="streak-icon__bin-lid" d="M7.5 9.6h9l-.8-2H8.3l-.8 2Z" />
      <path className="streak-icon__bin-rim" d="M9.5 7.6h5" />
      <path
        className="streak-icon__flame streak-icon__flame--left"
        d="M10.2 9.9c-.8 1.3-.9 2.6-.2 3.7.4-.7.9-1.2 1.5-1.2.4 0 .6.2.9.5-.2-1.2-.1-2.3.4-3.2-.6.3-1.2 0-1.6-.4Z"
      />
      <path
        className="streak-icon__flame streak-icon__flame--center"
        d="M12 8.4c-1 1.7-1.1 3.5 0 4.9.5-.7 1.2-1.2 1.9-1.2s1.4.5 1.9 1.2c1.1-1.4 1-3.2 0-4.9-.9.4-1.9.4-2.8 0Z"
      />
      <path
        className="streak-icon__flame streak-icon__flame--right"
        d="M13.8 9.9c.6-.4 1.2 0 1.6.4.5.9.7 2 .4 3.2.3-.3.5-.5.9-.5.5 0 1.1.4 1.5 1.2.6-1.1.5-2.4-.3-3.7Z"
      />
      {tier === "black" ? (
        <>
          <path className="streak-icon__smoke" d="M8.8 6.2c.3-.7.7-.7 1 0" />
          <path className="streak-icon__smoke" d="M12.1 5.2c.3-.8.7-.8 1 0" />
          <path className="streak-icon__smoke" d="M15.4 6.2c.3-.7.7-.7 1 0" />
        </>
      ) : null}
    </svg>
  );
}
