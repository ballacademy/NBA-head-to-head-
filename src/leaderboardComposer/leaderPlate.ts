import { getTeamColors } from "../lib/teamColors";

export const LEADER_PLATE_EMPTY = "#2a2a2a";

const mixHex = (hex: string, other: string, amount: number) => {
  const parse = (value: string) => {
    const raw = value.replace("#", "");
    return {
      r: Number.parseInt(raw.slice(0, 2), 16) || 0,
      g: Number.parseInt(raw.slice(2, 4), 16) || 0,
      b: Number.parseInt(raw.slice(4, 6), 16) || 0,
    };
  };
  const a = parse(hex);
  const b = parse(other);
  const t = Math.min(1, Math.max(0, amount));
  const ch = (left: number, right: number) =>
    Math.round(left + (right - left) * t)
      .toString(16)
      .padStart(2, "0");
  return `#${ch(a.r, b.r)}${ch(a.g, b.g)}${ch(a.b, b.b)}`;
};

/** Dark team-color fill so white list type still reads. */
export const leaderPlateFill = (teamId: string | null) => {
  if (!teamId) {
    return LEADER_PLATE_EMPTY;
  }
  const primary = getTeamColors(teamId).primary;
  if (primary.toLowerCase() === "#000000") {
    return "#2f2f2f";
  }
  return mixHex(primary, "#080808", 0.4);
};

export const leaderPlateAccent = (teamId: string | null) => {
  if (!teamId) {
    return "rgba(255,255,255,0.18)";
  }
  return getTeamColors(teamId).secondary;
};

export const packedLeaderRowH = (usableH: number, count: number, gap: number) => {
  const n = Math.max(1, count);
  return (usableH - gap * (n - 1)) / n;
};
