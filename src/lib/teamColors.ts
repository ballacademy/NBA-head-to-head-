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

const mixWithWhite = (hex: string, amount: number) => {
  const { r, g, b } = hexToRgb(hex);
  const t = Math.max(0, Math.min(1, amount));
  return rgbToHex(r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t);
};

/**
 * Outline/glow color for dark UI chips. Keeps vibrant primaries, but swaps to
 * the brighter secondary (or a lifted tint) when the primary is a dark navy/black
 * that disappears on charcoal chips (DEN / MIN / UTA / IND / etc.).
 */
const TIER_GLOW_OVERRIDES: Record<string, string> = {
  // Both official blues read dull on charcoal — use Aurora Green for borders.
  MIN: "#78BE20",
};

export const getTeamGlowColor = (team: string): string => {
  const override = TIER_GLOW_OVERRIDES[team];
  if (override) {
    return override;
  }

  const { primary, secondary } = getTeamColors(team);
  const primaryLum = relativeLuminance(primary);
  const secondaryLum = relativeLuminance(secondary);

  if (primaryLum >= 0.14) {
    return primaryLum < 0.2 ? mixWithWhite(primary, 0.12) : primary;
  }

  if (secondaryLum > primaryLum) {
    return secondaryLum >= 0.16
      ? secondary
      : mixWithWhite(secondary, 0.35);
  }

  return mixWithWhite(primary, 0.42);
};

