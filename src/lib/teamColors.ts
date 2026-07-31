export interface TeamColors {
  primary: string;
  secondary: string;
}

const DEFAULT_TEAM_COLORS: TeamColors = {
  primary: "#334155",
  secondary: "#f8fafc",
};

export const TEAM_COLORS: Record<string, TeamColors> = {
  ATL: { primary: "#E03A3E", secondary: "#C1D32F" },
  BOS: { primary: "#007A33", secondary: "#BA9653" },
  BRK: { primary: "#000000", secondary: "#FFFFFF" },
  BKN: { primary: "#000000", secondary: "#FFFFFF" },
  CHA: { primary: "#1D1160", secondary: "#00788C" },
  CHO: { primary: "#1D1160", secondary: "#00788C" },
  CHI: { primary: "#CE1141", secondary: "#000000" },
  CLE: { primary: "#860038", secondary: "#FDBB30" },
  DAL: { primary: "#00538C", secondary: "#B8C4CA" },
  DEN: { primary: "#0E2240", secondary: "#FEC524" },
  DET: { primary: "#C8102E", secondary: "#1D42BA" },
  GSW: { primary: "#1D428A", secondary: "#FFC72C" },
  HOU: { primary: "#CE1141", secondary: "#000000" },
  IND: { primary: "#002D62", secondary: "#FDBB30" },
  LAC: { primary: "#C8102E", secondary: "#1D428A" },
  LAL: { primary: "#552583", secondary: "#FDB927" },
  MEM: { primary: "#5D76A9", secondary: "#12173F" },
  MIA: { primary: "#98002E", secondary: "#F9A01B" },
  MIL: { primary: "#00471B", secondary: "#EEE1C6" },
  MIN: { primary: "#0C2340", secondary: "#236192" },
  NOP: { primary: "#0C2340", secondary: "#C8102E" },
  NO: { primary: "#0C2340", secondary: "#C8102E" },
  NYK: { primary: "#006BB6", secondary: "#F58426" },
  OKC: { primary: "#007AC1", secondary: "#EF3B24" },
  ORL: { primary: "#0077C0", secondary: "#C4CED4" },
  PHI: { primary: "#006BB6", secondary: "#ED174C" },
  PHO: { primary: "#1D1160", secondary: "#E56020" },
  PHX: { primary: "#1D1160", secondary: "#E56020" },
  POR: { primary: "#E03A3E", secondary: "#000000" },
  SAC: { primary: "#5A2D81", secondary: "#63727A" },
  SAS: { primary: "#C4CED4", secondary: "#000000" },
  SA: { primary: "#C4CED4", secondary: "#000000" },
  TOR: { primary: "#CE1141", secondary: "#000000" },
  UTA: { primary: "#002B5C", secondary: "#F9A01B" },
  WAS: { primary: "#002B5C", secondary: "#E31837" },
  FA: { primary: "#334155", secondary: "#F8FAFC" },
  RFA: { primary: "#1E3A5F", secondary: "#93C5FD" },
};

export const getTeamColors = (team: string): TeamColors =>
  TEAM_COLORS[team] ?? DEFAULT_TEAM_COLORS;

const hexToRgb = (hex: string) => {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) {
    return { r: 51, g: 65, b: 85 };
  }

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
};

const rgbToHex = (r: number, g: number, b: number) => {
  const toHex = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value)))
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const hexToHsl = (hex: string) => {
  const { r, g, b } = hexToRgb(hex);
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  const lightness = (max + min) / 2;

  if (delta === 0) {
    return { h: 0, s: 0, l: lightness };
  }

  const saturation =
    lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);

  let hue = 0;
  if (max === rn) {
    hue = ((gn - bn) / delta) % 6;
  } else if (max === gn) {
    hue = (bn - rn) / delta + 2;
  } else {
    hue = (rn - gn) / delta + 4;
  }

  return {
    h: (hue * 60 + 360) % 360,
    s: saturation,
    l: lightness,
  };
};

const hslToHex = (h: number, s: number, l: number) => {
  const saturation = Math.max(0, Math.min(1, s));
  const lightness = Math.max(0, Math.min(1, l));
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const huePrime = ((h % 360) + 360) % 360 / 60;
  const x = chroma * (1 - Math.abs((huePrime % 2) - 1));
  let rn = 0;
  let gn = 0;
  let bn = 0;

  if (huePrime >= 0 && huePrime < 1) {
    rn = chroma;
    gn = x;
  } else if (huePrime < 2) {
    rn = x;
    gn = chroma;
  } else if (huePrime < 3) {
    gn = chroma;
    bn = x;
  } else if (huePrime < 4) {
    gn = x;
    bn = chroma;
  } else if (huePrime < 5) {
    rn = x;
    bn = chroma;
  } else {
    rn = chroma;
    bn = x;
  }

  const match = lightness - chroma / 2;
  return rgbToHex(
    (rn + match) * 255,
    (gn + match) * 255,
    (bn + match) * 255,
  );
};

/** Relative luminance 0–1 (sRGB). */
const relativeLuminance = (hex: string) => {
  const { r, g, b } = hexToRgb(hex);
  const channel = (value: number) => {
    const normalized = value / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };

  return (
    0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
  );
};

/**
 * Lift a dark brand color in-hue so it stays readable on charcoal chips
 * without washing into pink/gray (mixing white) or flipping to a yellow secondary.
 */
const brightenForGlow = (hex: string) => {
  const { h, s, l } = hexToHsl(hex);
  const luminance = relativeLuminance(hex);

  // Near-black / near-gray — keep a bright neutral instead of inventing a hue.
  if (s < 0.12 && l < 0.28) {
    return "#E2E8F0";
  }

  // Already readable and chromatic — keep the official color.
  if (luminance >= 0.18) {
    return hex;
  }

  // Soft / silver tones: lift lightly without inventing neon saturation.
  if (s < 0.35) {
    return hslToHex(h, s, Math.min(0.72, Math.max(l, 0.62)));
  }

  // Dark chromatic brand colors: raise lightness in-hue, keep saturation honest.
  const isWarmRed = h <= 25 || h >= 330;
  const targetL = isWarmRed ? 0.5 : 0.48;
  const nextS = Math.min(1, Math.max(s, 0.62));
  const nextL = Math.min(0.56, Math.max(l, targetL));
  return hslToHex(h, nextS, nextL);
};

/**
 * Curated bright outlines where the auto-brightened primary would miss the
 * recognizable brand accent (gold Nuggets / Jazz / Pacers, Heat red-orange,
 * Suns orange, Hornets teal, etc.).
 */
const TIER_GLOW_OVERRIDES: Record<string, string> = {
  // Reddish orange — Heat identity, not secondary yellow/gold.
  MIA: "#FF4A1F",
  // Brand golds / warm accents that should win over dark navy primaries.
  DEN: "#FEC524",
  UTA: "#F9A01B",
  IND: "#FDBB30",
  GSW: "#FFC72C",
  // Suns orange (not lifted purple).
  PHO: "#F06A28",
  PHX: "#F06A28",
  // Hornets teal (not lifted purple).
  CHA: "#1AA3B8",
  CHO: "#1AA3B8",
  // Timberwolves Aurora Green — both blues read dull on charcoal.
  MIN: "#78BE20",
  // Pelicans / Wizards: red accent reads clearer than lifted navy.
  NOP: "#E3123A",
  NO: "#E3123A",
  WAS: "#F01F45",
  // Cavs wine (not secondary gold).
  CLE: "#D4144A",
  // Lakers purple (not secondary gold).
  LAL: "#9B5DE8",
  // Kings purple (not slate gray secondary).
  SAC: "#9B5DE5",
  // Bucks green (not cream secondary).
  MIL: "#1F9A4A",
  // Celtics green — keep forest-bright, not neon.
  BOS: "#00A34A",
  // Mavericks blue (not silver secondary).
  DAL: "#1A7AB8",
  // Knicks / Sixers blue (not orange/red secondary).
  NYK: "#1A8AD4",
  PHI: "#1A8AD4",
  // Stable blues that otherwise overshoot when auto-lifted.
  OKC: "#1A93D6",
  ORL: "#1A90D6",
  MEM: "#7B93C4",
  // Spurs silver.
  SAS: "#C4CED4",
  SA: "#C4CED4",
  // Free-agent neutrals.
  FA: "#94A3B8",
  RFA: "#93C5FD",
};

export const getTeamGlowColor = (team: string): string => {
  const override = TIER_GLOW_OVERRIDES[team];
  if (override) {
    return override;
  }

  return brightenForGlow(getTeamColors(team).primary);
};
