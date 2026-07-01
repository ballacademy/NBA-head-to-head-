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
        d="M12 21.75c-4.35-3.95-6.25-7.45-6.25-10.85 0-3 1.9-5.35 4.45-6.35.15 1.55 1.35 2.65 2.8 2.65s2.65-1.1 2.8-2.65c2.55 1 4.45 3.35 4.45 6.35 0 3.4-1.9 6.9-6.25 10.85Z"
      />
      <path
        className="streak-icon__flame streak-icon__flame--inner"
        d="M12 18.35c-2.45-2.25-3.55-4.65-3.55-7 0-2.05 1.25-3.7 3-4.55.2 1.05 1 1.85 2.05 1.85s1.85-.8 2.05-1.85c1.75.85 3 2.5 3 4.55 0 2.35-1.1 4.75-3.55 7Z"
      />
      <path
        className="streak-icon__flame streak-icon__flame--core"
        d="M12 15.65c-1.25-1.15-1.85-2.55-1.85-3.9 0-1.15.65-2.1 1.5-2.6.35.55.8.95 1.45.95s1.1-.4 1.45-.95c.85.5 1.5 1.45 1.5 2.6 0 1.35-.6 2.75-1.85 3.9Z"
      />
      {tier === "blue" ? (
        <path
          className="streak-icon__bolt"
          d="M13.1 6.35 10.35 12h2.15l-1.25 3.85 3.85-5.75H13.3l-.2-3.75Z"
        />
      ) : null}
      {tier === "black" ? (
        <path
          className="streak-icon__crown"
          d="M6.25 8.1 8.55 5.55 10.45 7.35 12 4.75 13.55 7.35 15.45 5.55 17.75 8.1V9.5H6.25V8.1Z"
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
        d="M8.25 12.75h7.5l-.7 8.85a1.45 1.45 0 0 1-1.45 1.3h-3.2a1.45 1.45 0 0 1-1.45-1.3l-.7-8.85Z"
      />
      <path
        className="streak-icon__bin-lid"
        d="M7.5 12.75h9l-.65-2.05a.75.75 0 0 0-.7-.5h-6a.75.75 0 0 0-.7.5l-.65 2.05Z"
      />
      <path className="streak-icon__bin-rim" d="M10.25 9.85h3.5" />
      <path
        className="streak-icon__flame streak-icon__flame--left"
        d="M9.65 12.35c-.7 1.15-.75 2.3-.15 3.25.35-.7.85-1.1 1.35-1.1.35 0 .6.15.85.4-.25-1.2-.2-2.25.4-3.1-.6.35-1.25.15-1.65-.35Z"
      />
      <path
        className="streak-icon__flame streak-icon__flame--center"
        d="M12 10.85c-1.05 1.7-1.1 3.45 0 4.85.55-.75 1.25-1.2 2-1.2s1.45.45 2 1.2c1.1-1.4 1.05-3.15 0-4.85-.95.45-1.95.45-2.9 0Z"
      />
      <path
        className="streak-icon__flame streak-icon__flame--right"
        d="M14.35 12.35c.4-.5 1.05-.7 1.65-.35.6.85.65 1.9.4 3.1.25-.25.5-.4.85-.4.5 0 1 .4 1.35 1.1.6-.95.55-2.1-.15-3.25-.4.5-1.05.7-1.65.35Z"
      />
      {tier === "black" ? (
        <>
          <path className="streak-icon__smoke" d="M8.75 6.45c.35-.75.75-.75 1.1 0" />
          <path className="streak-icon__smoke" d="M12 5.35c.35-.85.75-.85 1.1 0" />
          <path className="streak-icon__smoke" d="M15.25 6.45c.35-.75.75-.75 1.1 0" />
        </>
      ) : null}
    </svg>
  );
}
