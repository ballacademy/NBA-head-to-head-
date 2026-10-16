const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const isCustomPhotoSlot = (value: Record<string, unknown>) =>
  value.customPhoto === true &&
  typeof value.photoSrc === "string" &&
  Boolean(value.photoSrc);

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

/** Blank a board but keep custom photo crops in the same slots. */
export const keepComposerPhotos = <T>(blank: T, current: T): T => {
  const walk = (empty: unknown, live: unknown): unknown => {
    if (Array.isArray(empty)) {
      const rows = Array.isArray(live) ? live : [];
      return empty.map((item, index) => walk(item, rows[index]));
    }
    if (!isRecord(empty)) {
      return empty;
    }
    const source = isRecord(live) ? live : {};
    const next: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(empty)) {
      if (key === "photoSrc" || key === "customPhoto" || key === "pan") {
        continue;
      }
      next[key] = walk(child, source[key]);
    }
    if (isCustomPhotoSlot(source)) {
      next.photoSrc = source.photoSrc;
      next.customPhoto = true;
      if (isRecord(source.pan)) {
        next.pan = { ...source.pan };
      } else if ("pan" in empty) {
        next.pan = empty.pan;
      }
    } else {
      if ("photoSrc" in empty) {
        next.photoSrc = empty.photoSrc;
      }
      if ("customPhoto" in empty) {
        next.customPhoto = empty.customPhoto;
      }
      if ("pan" in empty) {
        next.pan = empty.pan;
      }
    }
    return next;
  };
  return walk(blank, current) as T;
};
