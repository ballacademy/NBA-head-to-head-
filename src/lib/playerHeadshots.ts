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

const DEFAULT_HEADSHOT_LOAD_TIMEOUT_MS = 8_000;

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

const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T | null> => {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
};

const imageFromObjectUrl = (objectUrl: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const element = new Image();
    element.onload = () => {
      if (element.naturalWidth <= 0 || element.naturalHeight <= 0) {
        resolve(null);
        return;
      }
      (
        element as HTMLImageElement & {
          __headshotObjectUrl?: string;
        }
      ).__headshotObjectUrl = objectUrl;
      resolve(element);
    };
    element.onerror = () => resolve(null);
    element.src = objectUrl;
  });

const loadImageElementDirect = (url: string) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    const element = new Image();
    element.crossOrigin = "anonymous";
    element.referrerPolicy = "no-referrer";
    element.onload = () => {
      if (element.naturalWidth <= 0 || element.naturalHeight <= 0) {
        resolve(null);
        return;
      }
      resolve(element);
    };
    element.onerror = () => resolve(null);
    // Cache-bust so we don't reuse a non-CORS HTML <img> cache entry.
    const separator = url.includes("?") ? "&" : "?";
    element.src = `${url}${separator}ddgmCanvas=1`;
  });

/**
 * Load a headshot as a canvas-safe image.
 *
 * Important: the live UI `<img>` tags may already have cached the ESPN URL
 * without CORS. Reloading that same URL with `crossOrigin="anonymous"` often
 * fails from cache, which made share cards silently fall back to jerseys.
 * Prefer `fetch` + object URL; fall back to a cache-busted Image load.
 */
export const loadCorsImage = async (
  url: string,
  timeoutMs = DEFAULT_HEADSHOT_LOAD_TIMEOUT_MS,
): Promise<HTMLImageElement | null> => {
  if (typeof Image === "undefined") {
    return null;
  }

  const loadViaFetch = async () => {
    if (typeof fetch === "undefined") {
      return null;
    }

    const response = await fetch(url, {
      mode: "cors",
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });

    if (!response.ok) {
      return null;
    }

    const blob = await response.blob();
    if (blob.size === 0) {
      return null;
    }

    const objectUrl = URL.createObjectURL(blob);
    const image = await imageFromObjectUrl(objectUrl);
    if (!image) {
      URL.revokeObjectURL(objectUrl);
    }
    return image;
  };

  try {
    const viaFetch = await withTimeout(loadViaFetch(), timeoutMs);
    if (viaFetch) {
      return viaFetch;
    }
  } catch {
    // Fall through to direct Image load.
  }

  try {
    return await withTimeout(loadImageElementDirect(url), timeoutMs);
  } catch {
    return null;
  }
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
