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
