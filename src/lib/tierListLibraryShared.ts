import type {
  TierListLibrary,
  TierListSavedDocument,
  TierListState,
} from "./tierList";
import { normalizeTierListLibrary, normalizeTierListState } from "./tierList";

export interface TierListAccountPayload {
  current: TierListState;
  currentUpdatedAt: number;
  library: TierListLibrary;
}

const asTimestamp = (value: unknown) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.round(value));
};

export const emptyTierListAccountPayload = (): TierListAccountPayload => ({
  current: normalizeTierListState(null),
  currentUpdatedAt: 0,
  library: { documents: [] },
});

export const normalizeTierListAccountPayload = (
  raw: unknown,
): TierListAccountPayload => {
  if (!raw || typeof raw !== "object") {
    return emptyTierListAccountPayload();
  }

  const row = raw as Partial<TierListAccountPayload>;
  return {
    current: normalizeTierListState(row.current),
    currentUpdatedAt: asTimestamp(row.currentUpdatedAt),
    library: normalizeTierListLibrary(row.library),
  };
};

export const parseTierListAccountJson = (raw: string): TierListAccountPayload => {
  try {
    return normalizeTierListAccountPayload(JSON.parse(raw) as unknown);
  } catch {
    return emptyTierListAccountPayload();
  }
};

const countAssignedPlayers = (state: TierListState) =>
  state.tiers.reduce((total, tier) => total + tier.playerIds.length, 0);

const pickCurrentBoard = (
  left: TierListState,
  leftUpdatedAt: number,
  right: TierListState,
  rightUpdatedAt: number,
): { current: TierListState; currentUpdatedAt: number } => {
  if (leftUpdatedAt > rightUpdatedAt) {
    return { current: left, currentUpdatedAt: leftUpdatedAt };
  }
  if (rightUpdatedAt > leftUpdatedAt) {
    return { current: right, currentUpdatedAt: rightUpdatedAt };
  }

  if (countAssignedPlayers(left) >= countAssignedPlayers(right)) {
    return { current: left, currentUpdatedAt: leftUpdatedAt };
  }

  return { current: right, currentUpdatedAt: rightUpdatedAt };
};

const mergeLibraryDocuments = (
  left: TierListSavedDocument[],
  right: TierListSavedDocument[],
) => {
  const byId = new Map<string, TierListSavedDocument>();

  for (const document of [...left, ...right]) {
    const existing = byId.get(document.id);
    if (!existing || document.savedAt >= existing.savedAt) {
      byId.set(document.id, document);
    }
  }

  return [...byId.values()].sort((a, b) => b.savedAt - a.savedAt);
};

/** Merge saved boards and the in-progress editor across devices. */
export const mergeTierListAccountPayload = (
  ...payloads: TierListAccountPayload[]
): TierListAccountPayload => {
  let current = emptyTierListAccountPayload().current;
  let currentUpdatedAt = 0;
  let documents: TierListSavedDocument[] = [];

  for (const payload of payloads) {
    const normalized = normalizeTierListAccountPayload(payload);
    const picked = pickCurrentBoard(
      current,
      currentUpdatedAt,
      normalized.current,
      normalized.currentUpdatedAt,
    );
    current = picked.current;
    currentUpdatedAt = picked.currentUpdatedAt;
    documents = mergeLibraryDocuments(documents, normalized.library.documents);
  }

  return {
    current,
    currentUpdatedAt,
    library: { documents },
  };
};
