import type { Env } from "../types";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

const ALLOWED_EVENTS = new Set([
  "daily_finish",
  "account_create",
  "share_lineup",
  "matchmaking_cancel",
  "play_mode_open",
]);

const EVENT_PATTERN = /^[a-z][a-z0-9_]{1,48}$/;
const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const utcDayKey = (iso?: string) => {
  const date = iso ? new Date(iso) : new Date();
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
};

const parseEventName = (value: unknown) => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!EVENT_PATTERN.test(trimmed) || !ALLOWED_EVENTS.has(trimmed)) {
    return null;
  }
  return trimmed;
};

/** Fail-open product counters. Missing table or DB errors still return 204. */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    let body: unknown;
    try {
      body = await context.request.json();
    } catch {
      return json({ ok: false, error: "invalid_json" }, 400);
    }

    const record =
      body && typeof body === "object" ? (body as Record<string, unknown>) : null;
    const eventName = parseEventName(record?.event);
    if (!eventName) {
      return json({ ok: false, error: "invalid_event" }, 400);
    }

    const at = typeof record?.at === "string" ? record.at : undefined;
    const dayKey = utcDayKey(at);
    if (!DAY_KEY_PATTERN.test(dayKey)) {
      return json({ ok: false, error: "invalid_day" }, 400);
    }

    const db = context.env.DB;
    if (!db) {
      return new Response(null, { status: 204 });
    }

    const updatedAt = new Date().toISOString();

    try {
      await db
        .prepare(
          `INSERT INTO product_analytics (event_name, day_key, count, updated_at)
           VALUES (?, ?, 1, ?)
           ON CONFLICT(event_name, day_key) DO UPDATE SET
             count = count + 1,
             updated_at = excluded.updated_at`,
        )
        .bind(eventName, dayKey, updatedAt)
        .run();
    } catch {
      // Table may not exist yet — fail open.
      return new Response(null, { status: 204 });
    }

    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 204 });
  }
};

export const onRequestOptions: PagesFunction<Env> = async () =>
  new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type",
      "access-control-max-age": "86400",
    },
  });
