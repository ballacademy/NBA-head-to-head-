/**
 * Runtime QA vs production detection (client hostname).
 *
 * Keep feature parity between QA and prod by default. Only gate intentional
 * QA-only experiments here (All-Time playable, player headshots, etc.).
 */

const QA_HOST_MARKERS = ["nba-head-to-head-qa"] as const;
const QA_EXACT_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "qa.draftdaygm.com",
]);

/** True when the app is running on a QA / local host (not production). */
export const isQaRuntimeHost = (
  hostname = typeof window !== "undefined" ? window.location.hostname : "",
): boolean => {
  if (!hostname) {
    return false;
  }

  const normalized = hostname.trim().toLowerCase();
  if (QA_EXACT_HOSTS.has(normalized)) {
    return true;
  }

  return QA_HOST_MARKERS.some((marker) => normalized.includes(marker));
};
