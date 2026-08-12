export type ProductAnalyticsEvent =
  | "daily_finish"
  | "account_create"
  | "share_lineup"
  | "matchmaking_cancel"
  | "play_mode_open";

export type ProductAnalyticsProps = Record<
  string,
  string | number | boolean | null | undefined
>;

interface QueuedProductEvent {
  event: ProductAnalyticsEvent;
  props: ProductAnalyticsProps;
  sessionId: string;
  at: string;
}

const SESSION_KEY = "ddgm:analytics-session";
const ENDPOINT = "/api/analytics";
const MAX_QUEUE = 40;

const eventQueue: QueuedProductEvent[] = [];

const createSessionId = () => {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    // Fall through.
  }

  return `anon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

export const getAnalyticsSessionId = (): string => {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing && existing.length >= 8 && existing.length <= 80) {
      return existing;
    }

    const next = createSessionId().slice(0, 80);
    sessionStorage.setItem(SESSION_KEY, next);
    return next;
  } catch {
    return createSessionId().slice(0, 80);
  }
};

export const getQueuedProductEvents = (): readonly QueuedProductEvent[] =>
  eventQueue;

export const clearQueuedProductEvents = () => {
  eventQueue.length = 0;
};

const sanitizeProps = (props?: ProductAnalyticsProps) => {
  if (!props) {
    return {};
  }

  const cleaned: ProductAnalyticsProps = {};
  for (const [key, value] of Object.entries(props)) {
    if (value == null) {
      continue;
    }
    if (typeof value === "string") {
      cleaned[key] = value.slice(0, 120);
      continue;
    }
    cleaned[key] = value;
  }
  return cleaned;
};

const postAnalyticsPayload = (body: string) => {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon(ENDPOINT, blob)) {
        return;
      }
    }
  } catch {
    // Fall through to fetch.
  }

  try {
    void fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
      credentials: "omit",
      cache: "no-store",
    }).catch(() => undefined);
  } catch {
    // Fail open — never block UX.
  }
};

/** Cookie-free first-party product counters. Never throws into callers. */
export const trackProductEvent = (
  event: ProductAnalyticsEvent,
  props?: ProductAnalyticsProps,
) => {
  try {
    const payload: QueuedProductEvent = {
      event,
      props: sanitizeProps(props),
      sessionId: getAnalyticsSessionId(),
      at: new Date().toISOString(),
    };

    eventQueue.push(payload);
    if (eventQueue.length > MAX_QUEUE) {
      eventQueue.splice(0, eventQueue.length - MAX_QUEUE);
    }

    postAnalyticsPayload(
      JSON.stringify({
        event: payload.event,
        props: payload.props,
        sessionId: payload.sessionId,
        at: payload.at,
      }),
    );
  } catch {
    // Fail open.
  }
};
