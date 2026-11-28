import type { Env } from "../types";
import { requireLinkedAccountSession } from "../lib/accountSessions";
import {
  loadComposerLibraryRow,
  mergeComposerLibraryFiles,
  parseComposerLibraryFile,
  upsertComposerLibraryRow,
} from "../lib/composerLibrarySync";
import {
  COMPOSER_LIBRARY_KIND,
  COMPOSER_LIBRARY_VERSION,
} from "../../src/instagramComposer/composerLibrary";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

const parsePlayerId = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim().slice(0, 128)
    : "";

const emptyLibrary = () => ({
  version: COMPOSER_LIBRARY_VERSION,
  kind: COMPOSER_LIBRARY_KIND,
  savedAt: 0,
  libraries: {},
});

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const requestedPlayerId = parsePlayerId(url.searchParams.get("playerId"));
  if (!requestedPlayerId) {
    return json({ error: "playerId is required" }, 400);
  }
  const auth = await requireLinkedAccountSession(
    context.request,
    context.env.DB,
    requestedPlayerId,
  );
  if (!auth.ok) return auth.response;
  const { playerId } = auth;
  const row = await loadComposerLibraryRow(context.env.DB, playerId);
  let library = emptyLibrary();
  if (row) {
    try {
      library =
        parseComposerLibraryFile(JSON.parse(row.library_json) as unknown) ??
        emptyLibrary();
    } catch {
      library = emptyLibrary();
    }
  }
  return json({
    playerId,
    library,
    updatedAt: row?.updated_at ?? null,
  });
};

interface LibraryBody {
  playerId?: unknown;
  library?: unknown;
}

export const onRequestPut: PagesFunction<Env> = async (context) => {
  let body: LibraryBody;
  try {
    body = (await context.request.json()) as LibraryBody;
  } catch {
    return json({ error: "invalid JSON body" }, 400);
  }
  const requestedPlayerId = parsePlayerId(body.playerId);
  if (!requestedPlayerId) {
    return json({ error: "playerId is required" }, 400);
  }
  const auth = await requireLinkedAccountSession(
    context.request,
    context.env.DB,
    requestedPlayerId,
  );
  if (!auth.ok) return auth.response;
  const { playerId } = auth;
  const incoming = parseComposerLibraryFile(body.library) ?? emptyLibrary();
  const existing = await loadComposerLibraryRow(context.env.DB, playerId);
  const existingLibrary = existing
    ? parseComposerLibraryFile(JSON.parse(existing.library_json) as unknown)
    : emptyLibrary();
  const merged = mergeComposerLibraryFiles(existingLibrary ?? emptyLibrary(), incoming);
  const updatedAt = new Date().toISOString();
  await upsertComposerLibraryRow(context.env.DB, playerId, merged, updatedAt);
  return json({
    playerId,
    library: merged,
    updatedAt,
  });
};
