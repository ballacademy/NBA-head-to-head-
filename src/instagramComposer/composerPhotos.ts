const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

/** Drop custom photos from a saved board so a template keeps layout only. */
export const stripComposerPhotos = <T>(board: T): T => {
  const walk = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      return value.map(walk);
    }
    if (!isRecord(value)) {
      return value;
    }
    const next: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      if (key === "photoSrc") {
        next[key] = null;
        continue;
      }
      if (key === "customPhoto") {
        next[key] = false;
        continue;
      }
      next[key] = walk(child);
    }
    return next;
  };
  return walk(board) as T;
};
