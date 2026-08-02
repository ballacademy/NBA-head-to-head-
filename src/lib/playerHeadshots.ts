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

const DEFAULT_HEADSHOT_LOAD_TIMEOUT_MS = 4_000;

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

const loadCorsImage = (
  url: string,
  timeoutMs: number,
): Promise<HTMLImageElement | null> => {
  if (typeof Image === "undefined") {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const image = new Image();
    let settled = false;

    const finish = (result: HTMLImageElement | null) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };

    const timer = setTimeout(() => finish(null), timeoutMs);

    image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.onload = () => finish(image);
    image.onerror = () => finish(null);
    image.src = url;
  });
};

/**
 * Preload ESPN headshots for canvas share/download cards.
 * Only runs when headshots are enabled (QA / local / ?headshots).
 * Failed or unmapped players are omitted so callers can fall back to jerseys.
 */
export const loadPlayerHeadshotImages = async (
  bbrPlayerIds: Array<string | undefined | null>,
  options?: {
    enabled?: boolean;
    timeoutMs?: number;
  },
): Promise<Map<string, HTMLImageElement>> => {
  const enabled = options?.enabled ?? arePlayerHeadshotsEnabled();
  const timeoutMs = options?.timeoutMs ?? DEFAULT_HEADSHOT_LOAD_TIMEOUT_MS;
  const loaded = new Map<string, HTMLImageElement>();

  if (!enabled) {
    return loaded;
  }

  const uniqueIds = [
    ...new Set(
      bbrPlayerIds.filter((id): id is string => Boolean(id && id.length > 0)),
    ),
  ];

  await Promise.all(
    uniqueIds.map(async (bbrPlayerId) => {
      const url = getPlayerHeadshotUrl(bbrPlayerId);
      if (!url) {
        return;
      }

      const image = await loadCorsImage(url, timeoutMs);
      if (image) {
        loaded.set(bbrPlayerId, image);
      }
    }),
  );

  return loaded;
};

/** Draw a circular ESPN headshot (cover + top-biased crop, matching live UI). */
export const drawCircularPlayerHeadshot = (
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  size: number,
  borderColor: string,
) => {
  const radius = size / 2;
  const centerX = x + radius;
  const centerY = y + radius;
  const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
  const sourceX = (image.naturalWidth - sourceSize) / 2;
  // Bias toward the face (matches object-position: center 18% in CSS).
  const sourceY = Math.max(
    0,
    (image.naturalHeight - sourceSize) * 0.18,
  );

  context.save();
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.closePath();
  context.clip();
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceSize,
    sourceSize,
    x,
    y,
    size,
    size,
  );
  context.restore();

  context.save();
  context.beginPath();
  context.arc(centerX, centerY, radius - 0.75, 0, Math.PI * 2);
  context.strokeStyle = borderColor;
  context.lineWidth = 2.5;
  context.stroke();
  context.restore();
};
