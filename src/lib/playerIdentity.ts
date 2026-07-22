import { readJson, writeJson } from "./browserStorage";

const PLAYER_IDENTITY_KEY = "nba-head-to-head-player-identity";
const LEGACY_PLAYER_ID_KEY = "nba-head-to-head-player-id";

export interface PlayerIdentity {
  playerId: string;
  publicTag: string;
}

const hashString = (value: string) => {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

export const derivePublicTag = (playerId: string) =>
  hashString(playerId).toString(16).toUpperCase().padStart(8, "0").slice(0, 4);

export const formatPublicTag = (publicTag: string) => {
  const normalized = publicTag.replace(/^#/, "").toUpperCase();

  return `#${normalized}`;
};

export const formatGmDisplayName = (name: string, publicTag: string) =>
  `${name.trim()} · ${formatPublicTag(publicTag)}`;

export const resolvePublicTag = (
  playerId: string,
  storedPublicTag?: string,
) => {
  const normalized = storedPublicTag?.replace(/^#/, "").trim().toUpperCase();

  if (normalized && /^[0-9A-F]{4}$/.test(normalized)) {
    return normalized;
  }

  return derivePublicTag(playerId);
};

const createPlayerId = () => {
  const cryptoApi = (globalThis as typeof globalThis & {
    crypto?: { randomUUID: () => string };
  }).crypto;

  if (cryptoApi?.randomUUID) {
    return cryptoApi.randomUUID();
  }

  return `player-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const loadStoredIdentity = (): PlayerIdentity | null => {
  const stored = readJson<PlayerIdentity>(PLAYER_IDENTITY_KEY);

  if (!stored || typeof stored.playerId !== "string") {
    return null;
  }

  return {
    playerId: stored.playerId,
    publicTag: resolvePublicTag(stored.playerId, stored.publicTag),
  };
};

const migrateLegacyPlayerId = (): PlayerIdentity | null => {
  const legacy = readJson<{ playerId: string }>(LEGACY_PLAYER_ID_KEY);

  if (!legacy?.playerId) {
    return null;
  }

  return {
    playerId: legacy.playerId,
    publicTag: derivePublicTag(legacy.playerId),
  };
};

const saveIdentity = (identity: PlayerIdentity) => {
  writeJson(PLAYER_IDENTITY_KEY, identity);
  writeJson(LEGACY_PLAYER_ID_KEY, { playerId: identity.playerId });
};

export const setPlayerIdentity = (playerId: string): PlayerIdentity => {
  const identity: PlayerIdentity = {
    playerId: playerId.trim(),
    publicTag: derivePublicTag(playerId.trim()),
  };

  saveIdentity(identity);
  return identity;
};

export const getOrCreatePlayerIdentity = (): PlayerIdentity => {
  const stored = loadStoredIdentity() ?? migrateLegacyPlayerId();

  if (stored) {
    saveIdentity(stored);

    return stored;
  }

  const playerId = createPlayerId();
  const identity: PlayerIdentity = {
    playerId,
    publicTag: derivePublicTag(playerId),
  };

  saveIdentity(identity);

  return identity;
};

export const getOrCreatePlayerId = () => getOrCreatePlayerIdentity().playerId;
