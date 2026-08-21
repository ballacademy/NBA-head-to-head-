const APP_ERROR_EVENT = "ddgm-app-error";

export type AppErrorDetail = {
  message: string;
  source?: string;
};

export const reportAppError = (message: string, source = "app") => {
  const detail: AppErrorDetail = {
    message: message.trim() || "Something went wrong.",
    source,
  };

  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<AppErrorDetail>(APP_ERROR_EVENT, { detail }),
  );
};

export const APP_ERROR_EVENT_NAME = APP_ERROR_EVENT;

/**
 * True when the user dismissed a browser prompt (e.g. Web Share cancel).
 * These should not surface as app errors.
 */
export const isUserDismissalError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") {
    return false;
  }

  const name =
    "name" in error && typeof error.name === "string" ? error.name : "";

  // AbortError: user cancelled share / picker / other transient UI.
  return name === "AbortError";
};

/**
 * Share-sheet dismissals that should not show an error toast.
 * Only AbortError — NotAllowedError often means share was blocked and
 * callers should fall back to download instead of silently exiting.
 */
export const isShareDismissalError = (error: unknown): boolean =>
  isUserDismissalError(error);

/**
 * Browser / extension noise that should not open the runtime error toaster.
 */
export const isBenignBrowserError = (event: ErrorEvent): boolean => {
  const message = event.message?.trim() ?? "";

  if (!message) {
    return true;
  }

  if (message === "Script error." || message === "Script error") {
    return true;
  }

  if (/ResizeObserver loop/i.test(message)) {
    return true;
  }

  const filename = event.filename ?? "";
  if (/^(chrome|moz|safari|webkit)-extension:\/\//i.test(filename)) {
    return true;
  }

  return false;
};
