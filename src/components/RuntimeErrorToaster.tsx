import { useEffect, useState } from "react";
import {
  APP_ERROR_EVENT_NAME,
  isBenignBrowserError,
  isUserDismissalError,
  type AppErrorDetail,
} from "../lib/appErrors";
import { buildBugReportMailto } from "../lib/support";

const AUTO_DISMISS_MS = 12_000;

export function RuntimeErrorToaster() {
  const [message, setMessage] = useState<string | null>(null);
  const [details, setDetails] = useState<string>("");

  useEffect(() => {
    const show = (nextMessage: string, nextDetails = "") => {
      setMessage(nextMessage);
      setDetails(nextDetails);
    };

    const onAppError = (event: Event) => {
      const custom = event as CustomEvent<AppErrorDetail>;
      const text = custom.detail?.message?.trim();
      if (!text) {
        return;
      }
      show(text, `${custom.detail?.source ?? "app"}: ${text}`);
    };

    const onWindowError = (event: ErrorEvent) => {
      if (isBenignBrowserError(event)) {
        return;
      }

      const text = event.message?.trim() || "Unexpected browser error.";
      show(text, text);
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      if (isUserDismissalError(event.reason)) {
        return;
      }

      const reason = event.reason;
      const text =
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
            ? reason
            : "A background request failed.";
      show(text, String(reason ?? text));
    };

    window.addEventListener(APP_ERROR_EVENT_NAME, onAppError as EventListener);
    window.addEventListener("error", onWindowError);
    window.addEventListener("unhandledrejection", onRejection);

    return () => {
      window.removeEventListener(
        APP_ERROR_EVENT_NAME,
        onAppError as EventListener,
      );
      window.removeEventListener("error", onWindowError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timer = window.setTimeout(() => {
      setMessage(null);
      setDetails("");
    }, AUTO_DISMISS_MS);

    return () => window.clearTimeout(timer);
  }, [message]);

  if (!message) {
    return null;
  }

  return (
    <div className="app-error-toast" role="alert" aria-live="assertive">
      <div className="app-error-toast__copy">
        <strong>Something went wrong</strong>
        <p>{message}</p>
      </div>
      <div className="app-error-toast__actions">
        <a className="app-error-toast__link" href={buildBugReportMailto(details)}>
          Email us
        </a>
        <button
          type="button"
          className="app-error-toast__dismiss"
          onClick={() => setMessage(null)}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
