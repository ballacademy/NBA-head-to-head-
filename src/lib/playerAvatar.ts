import { createAvatar } from "@dicebear/core";
import { micah } from "@dicebear/collection";

const avatarCache = new Map<string, string>();

export const getPlayerAvatarDataUri = (seed: string) => {
  const normalizedSeed = seed.trim() || "nba-player";

  if (avatarCache.has(normalizedSeed)) {
    return avatarCache.get(normalizedSeed)!;
  }

  const svg = createAvatar(micah, {
    seed: normalizedSeed,
    size: 128,
    backgroundColor: ["transparent"],
    radius: 50,
  }).toString();

  const dataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  avatarCache.set(normalizedSeed, dataUri);

  return dataUri;
};
