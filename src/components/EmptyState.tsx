import type { ReactNode } from "react";

export type EmptyStateProps = {
  message: ReactNode;
  /** Prefer hub-empty for hub surfaces; draft-empty for in-match drafts. */
  variant?: "hub" | "draft";
  actions?: ReactNode;
  loading?: boolean;
  role?: "status" | "alert";
  className?: string;
};

/** Consistent empty / loading copy for hub and draft surfaces. */
export function EmptyState({
  message,
  variant = "hub",
  actions,
  loading = false,
  role = "status",
  className = "",
}: EmptyStateProps) {
  const base = variant === "draft" ? "draft-empty" : "hub-empty";
  const classes = [base, className].filter(Boolean).join(" ");

  if (actions) {
    return (
      <div className={classes} role={role} aria-live={loading ? "polite" : undefined}>
        <p>{message}</p>
        <div className="hub-empty__actions">{actions}</div>
      </div>
    );
  }

  return (
    <p className={classes} role={role} aria-live={loading ? "polite" : undefined}>
      {message}
    </p>
  );
}
