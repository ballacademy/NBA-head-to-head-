import headshotData from "../../data/espn-player-headshots.json";

type HeadshotEntry = {
  espnId: string;
  name: string;
  headshotUrl: string;
};

const byBbrPlayerId = (
  headshotData as {
    byBbrPlayerId: Record<string, HeadshotEntry>;
  }
).byBbrPlayerId;

/** True on the QA Pages host, local dev, or when `?headshots` is in the URL. */
export const arePlayerHeadshotsEnabled = (
  hostname = typeof window !== "undefined" ? window.location.hostname : "",
  search = typeof window !== "undefined" ? window.location.search : "",
): boolean => {
  if (search.includes("headshots")) {
    return true;
  }

  if (!hostname) {
    return false;
  }

  return (
    hostname.includes("nba-head-to-head-qa") ||
    hostname === "localhost" ||
    hostname === "127.0.0.1"
  );
};

export const getPlayerHeadshotUrl = (
  bbrPlayerId: string | undefined | null,
): string | null => {
  if (!bbrPlayerId) {
    return null;
  }

  return byBbrPlayerId[bbrPlayerId]?.headshotUrl ?? null;
};
