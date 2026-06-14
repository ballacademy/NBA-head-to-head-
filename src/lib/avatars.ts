import { createAvatar } from "@dicebear/core";
import { openPeeps } from "@dicebear/collection";

// Cartoon avatars are generated locally from the open-source "Open Peeps"
// collection (CC0 / public domain), keyed deterministically by player id.
// This gives every player a unique cartoon face with zero image-licensing or
// publicity-rights risk and no external network calls at runtime.
const cache = new Map<string, string>();

export const avatarFor = (seed: string): string => {
  const cached = cache.get(seed);
  if (cached) {
    return cached;
  }

  const uri = createAvatar(openPeeps, {
    seed,
    size: 96,
    radius: 50,
    backgroundColor: ["1d4ed8", "0f172a", "f97316", "facc15", "22c55e"],
    backgroundType: ["solid"],
  }).toDataUri();

  cache.set(seed, uri);
  return uri;
};
