import type { ReactNode } from "react";

export type PostGameAction = {
  id: string;
  label: string;
  busyLabel?: string;
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
  variant?: "primary" | "secondary" | "text";
};

export type PostGameNextActionsProps = {
  /** Required gate (e.g. choose unlock) — shown above actions. */
  requiredMessage?: ReactNode;
  primary: PostGameAction;
  secondary?: PostGameAction[];
  className?: string;
};

/** Standardizes rematch / share / home ordering on results surfaces. */
export function PostGameNextActions({
  requiredMessage,
  primary,
  secondary = [],
  className = "",
}: PostGameNextActionsProps) {
  const renderButton = (action: PostGameAction) => {
    const variant = action.variant ?? (action.id === primary.id ? "primary" : "secondary");
    const classNameForVariant =
      variant === "primary"
        ? "landing__primary-button play-again-button match-results__primary-action"
        : variant === "text"
          ? "secondary-button"
          : "secondary-button";

    return (
      <button
        key={action.id}
        type="button"
        className={classNameForVariant}
        disabled={action.disabled || action.busy}
        onClick={action.onClick}
      >
        {action.busy ? action.busyLabel ?? "Working…" : action.label}
      </button>
    );
  };

  return (
    <div className={`post-game-next-actions ${className}`.trim()}>
      {requiredMessage ? (
        <p className="post-game-next-actions__required" role="status">
          {requiredMessage}
        </p>
      ) : null}
      <div className="match-results__action-row post-game-next-actions__row">
        {renderButton({ ...primary, variant: primary.variant ?? "primary" })}
        {secondary.map((action) =>
          renderButton({ ...action, variant: action.variant ?? "secondary" }),
        )}
      </div>
    </div>
  );
}
