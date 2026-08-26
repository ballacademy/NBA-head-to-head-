/** Hub-wide cloud sync / session notices (App listens and paints InlineAlert). */

export const CLOUD_SYNC_ERROR_EVENT = "ddgm:cloud-sync-error";

export type CloudSyncErrorDetail = {
  message: string;
};

export const emitCloudSyncError = (message: string) => {
  const trimmed = message.trim();
  if (!trimmed || typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<CloudSyncErrorDetail>(CLOUD_SYNC_ERROR_EVENT, {
      detail: { message: trimmed },
    }),
  );
};
