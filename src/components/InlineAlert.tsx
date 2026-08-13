import type { ReactNode } from "react";

export type InlineAlertAction = {
  label: string;
  busyLabel?: string;
  busy?: boolean;
  onClick: () => void;
  disabled?: boolean;
};

export type InlineAlertProps = {
  message: ReactNode;
  tone?: "error" | "info" | "success";
  action?: InlineAlertAction;
  className?: string;
  role?: "alert" | "status";
};

/** Inline error/info with optional retry — reuses existing form-error + sync-retry styles. */
export function InlineAlert({
  message,
  tone = "error",
  action,
  className = "",
  role,
}: InlineAlertProps) {
  const resolvedRole = role ?? (tone === "error" ? "alert" : "status");
  const classes = [
    tone === "error" ? "form-error" : "inline-alert",
    tone === "info" ? "inline-alert--info" : null,
    tone === "success" ? "inline-alert--success" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <p className={classes} role={resolvedRole}>
      {message}
      {action ? (
        <>
          {" "}
          <button
            type="button"
            className="daily-draft-results__sync-retry"
            disabled={action.disabled || action.busy}
            onClick={action.onClick}
          >
            {action.busy ? action.busyLabel ?? "Retrying…" : action.label}
          </button>
        </>
      ) : null}
    </p>
  );
}
