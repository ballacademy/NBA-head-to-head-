const avatarCache = new Map<string, string>();

const SKIN_TONES = ["#f5d0b5", "#e8b98a", "#c68642", "#8d5524", "#ffdbac"];
const HAIR_COLORS = ["#1a1a1a", "#4a3728", "#8b4513", "#d4a574", "#2c1810"];
const SHIRT_COLORS = ["#2563eb", "#dc2626", "#16a34a", "#9333ea", "#ea580c"];

const hashString = (value: string) => {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

const pick = <T>(hash: number, salt: number, options: readonly T[]) =>
  options[(hash + salt * 97) % options.length];

const buildCartoonAvatarSvg = (seed: string) => {
  const hash = hashString(seed);
  const skin = pick(hash, 0, SKIN_TONES);
  const hair = pick(hash, 1, HAIR_COLORS);
  const shirt = pick(hash, 2, SHIRT_COLORS);
  const hairStyle = hash % 4;
  const eyeOffset = (hash % 5) - 2;
  const smile = hash % 3;

  const hairPaths = [
  `<path d="M28 72c0-28 16-46 36-46s36 18 36 46c-10-8-22-12-36-12s-26 4-36 12z" fill="${hair}"/>`,
  `<path d="M24 70c2-30 20-48 40-48s38 18 40 48c-12-10-24-14-40-14s-28 4-40 14z" fill="${hair}"/><path d="M34 30c8-10 18-14 30-14s22 4 30 14" fill="none" stroke="${hair}" stroke-width="10" stroke-linecap="round"/>`,
  `<path d="M30 68c4-24 18-40 34-40s30 16 34 40c-8-6-18-10-34-10s-26 4-34 10z" fill="${hair}"/><rect x="52" y="18" width="24" height="16" rx="8" fill="${hair}"/>`,
  `<path d="M26 74c6-32 22-50 38-50s32 18 38 50c-14-12-26-16-38-16s-24 4-38 16z" fill="${hair}"/><circle cx="40" cy="42" r="10" fill="${hair}"/><circle cx="88" cy="42" r="10" fill="${hair}"/>`,
  ];

  const mouthPaths = [
    `<path d="M52 82 Q64 90 76 82" fill="none" stroke="#7c2d12" stroke-width="3" stroke-linecap="round"/>`,
    `<path d="M50 84 Q64 94 78 84" fill="none" stroke="#7c2d12" stroke-width="3" stroke-linecap="round"/>`,
    `<path d="M54 86h20" fill="none" stroke="#7c2d12" stroke-width="3" stroke-linecap="round"/>`,
  ];

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="Player avatar">
  <rect width="128" height="128" fill="${shirt}"/>
  <path d="M18 128h92c0-24-12-42-28-48v-8c10-8 16-20 16-34 0-22-16-38-36-38s-36 16-36 38c0 14 6 26 16 34v8c-16 6-28 24-28 48z" fill="${skin}"/>
  ${hairPaths[hairStyle]}
  <circle cx="${56 + eyeOffset}" cy="66" r="4" fill="#111827"/>
  <circle cx="${72 + eyeOffset}" cy="66" r="4" fill="#111827"/>
  <circle cx="${57 + eyeOffset}" cy="65" r="1.2" fill="#ffffff"/>
  <circle cx="${73 + eyeOffset}" cy="65" r="1.2" fill="#ffffff"/>
  <ellipse cx="64" cy="74" rx="4" ry="2.5" fill="#f59e0b" opacity="0.35"/>
  ${mouthPaths[smile]}
</svg>`;
};

export const getPlayerAvatarDataUri = (seed: string) => {
  const normalizedSeed = seed.trim() || "nba-player";

  if (avatarCache.has(normalizedSeed)) {
    return avatarCache.get(normalizedSeed)!;
  }

  const svg = buildCartoonAvatarSvg(normalizedSeed);
  const dataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  avatarCache.set(normalizedSeed, dataUri);

  return dataUri;
};
