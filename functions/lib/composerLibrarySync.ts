export {
  exportComposerLibrary,
  mergeComposerLibraryFiles,
  parseComposerLibraryFile,
  type ComposerLibraryFile,
} from "../../src/instagramComposer/composerLibrary";

import type { ComposerLibraryFile } from "../../src/instagramComposer/composerLibrary";

const ensureTable = async (db: D1Database) => {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS player_composer_library (
         player_id TEXT PRIMARY KEY,
         library_json TEXT NOT NULL,
         updated_at TEXT NOT NULL
       )`,
    )
    .run();
};

export const loadComposerLibraryRow = async (
  db: D1Database,
  playerId: string,
) => {
  await ensureTable(db);
  return db
    .prepare(
      `SELECT player_id, library_json, updated_at
       FROM player_composer_library
       WHERE player_id = ?`,
    )
    .bind(playerId)
    .first<{ player_id: string; library_json: string; updated_at: string }>();
};

export const upsertComposerLibraryRow = async (
  db: D1Database,
  playerId: string,
  library: ComposerLibraryFile,
  updatedAt: string,
) => {
  await ensureTable(db);
  await db
    .prepare(
      `INSERT INTO player_composer_library (player_id, library_json, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(player_id) DO UPDATE SET
         library_json = excluded.library_json,
         updated_at = excluded.updated_at`,
    )
    .bind(playerId, JSON.stringify(library), updatedAt)
    .run();
};
