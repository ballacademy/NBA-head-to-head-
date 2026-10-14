import { splitBalancedTitle } from "../instagramComposer/titleLayout";
import { TIER_LABEL_MAX_LENGTH } from "./tierLayout";

export const MIN_TIERS = 3;
export const MAX_TIERS = 10;
export const DEFAULT_TIER_LABELS = ["S", "A", "B", "C", "D", "F"] as const;
export const EXTRA_TIER_LABELS = ["G", "H", "I", "J"] as const;
export const DEFAULT_TIER_TITLE = "GUESS THE NBA TIER LIST";
export const DEFAULT_TIER_COLOR = "#ffffff";
/** Filled label-column palette — S gold, A red, then orange / yellow / green / blue. */
export const DEFAULT_TIER_PALETTE: Record<string, string> = {
  S: "#f5c400",
  A: "#e23b3b",
  B: "#f08a24",
  C: "#e8d44d",
  D: "#3cb371",
  F: "#5b8def",
  G: "#8b5cf6",
  H: "#ec4899",
  I: "#14b8a6",
  J: "#a8a29e",
};
export type TierSubject = "teams" | "players";

export interface TierRow {
  id: string;
  label: string;
  teams: string[];
  color?: string;
}

const HEX6 = /^#([0-9a-f]{6})$/i;
const HEX3 = /^#([0-9a-f]{3})$/i;

export const parseTierColor = (value: unknown): string => {
  if (typeof value !== "string") {
    return DEFAULT_TIER_COLOR;
  }
  const hex = value.trim();
  const six = HEX6.exec(hex);
  if (six) {
    return `#${six[1]!.toLowerCase()}`;
  }
  const three = HEX3.exec(hex);
  if (three) {
    const [r, g, b] = three[1]!;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return DEFAULT_TIER_COLOR;
};

export const isDefaultTierColor = (value: unknown) =>
  parseTierColor(value) === DEFAULT_TIER_COLOR;

export const paletteColorForLabel = (label: string, index = 0) => {
  const key = label.replace(/\s+/g, " ").trim().toUpperCase();
  if (DEFAULT_TIER_PALETTE[key]) {
    return DEFAULT_TIER_PALETTE[key]!;
  }
  const extras = Object.values(DEFAULT_TIER_PALETTE);
  return extras[index % extras.length] ?? "#f5c400";
};

/** Fill color for the label column — custom hex, else the S/A/B palette. */
export const resolvedTierColor = (
  label: string,
  color: unknown,
  index = 0,
) => {
  if (typeof color === "string" && color.trim() && !isDefaultTierColor(color)) {
    return parseTierColor(color);
  }
  return paletteColorForLabel(label, index);
};

/** One letter color on every filled label. */
export const TIER_LABEL_INK = "#111111";

const channelLum = (r: number, g: number, b: number) =>
  (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

export const fillLuminance = (hex: string) => {
  const color = parseTierColor(hex);
  const n = Number.parseInt(color.slice(1), 16);
  return channelLum((n >> 16) & 255, (n >> 8) & 255, n & 255);
};

/** Lighten a dark fill until black type stays readable — never switch letter color. */
export const fillForBlackInk = (hex: string, minLum = 0.58) => {
  let color = parseTierColor(hex);
  for (let step = 0; step < 16; step += 1) {
    if (fillLuminance(color) >= minLum) {
      return color;
    }
    const n = Number.parseInt(color.slice(1), 16);
    const mix = (channel: number) =>
      Math.min(255, Math.round(channel + (255 - channel) * 0.22));
    const r = mix((n >> 16) & 255);
    const g = mix((n >> 8) & 255);
    const b = mix(n & 255);
    color = `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
  }
  return color;
};

export const inkOnTierColor = (_hex?: string) => TIER_LABEL_INK;

export const hexToRgba = (hex: string, alpha: number) => {
  const color = parseTierColor(hex);
  const n = Number.parseInt(color.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export interface TierDraft {
  title: string;
  rows: TierRow[];
  showBa?: boolean;
  showNames?: boolean;
}

/** City on the given line, nickname on the family line — same stack as player names. */
export const splitTeamCellName = (name: string, shortName: string) => {
  const full = name.replace(/\s+/g, " ").trim();
  const short = shortName.replace(/\s+/g, " ").trim();
  if (!full) {
    return { firstName: "", lastName: "" };
  }
  if (!short) {
    return { firstName: "", lastName: full };
  }
  const escaped = short.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const city = full.replace(new RegExp(`\\s+${escaped}$`, "i"), "").trim();
  if (city && city !== full) {
    return { firstName: city, lastName: short };
  }
  return { firstName: "", lastName: full };
};

const nextId = () =>
  `tier-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export const createDefaultRows = (): TierRow[] =>
  DEFAULT_TIER_LABELS.map((label, index) => ({
    id: `tier-${label.toLowerCase()}`,
    label,
    teams: [],
    color: paletteColorForLabel(label, index),
  }));

export const isTierRows = (value: unknown): value is TierRow[] =>
  Array.isArray(value) &&
  value.length >= MIN_TIERS &&
  value.length <= MAX_TIERS &&
  value.every(
    (row) =>
      row &&
      typeof row === "object" &&
      typeof (row as TierRow).id === "string" &&
      typeof (row as TierRow).label === "string" &&
      Array.isArray((row as TierRow).teams) &&
      (row as TierRow).teams.every((id) => typeof id === "string"),
  );

export const usedTeamIds = (rows: TierRow[]): Set<string> => {
  const used = new Set<string>();
  for (const row of rows) {
    for (const id of row.teams) {
      used.add(id);
    }
  }
  return used;
};

export const rowIndexForTeam = (rows: TierRow[], teamId: string) =>
  rows.findIndex((row) => row.teams.includes(teamId));

export const addTier = (rows: TierRow[]): TierRow[] => {
  if (rows.length >= MAX_TIERS) {
    return rows;
  }
  const extras = EXTRA_TIER_LABELS.filter(
    (label) => !rows.some((row) => row.label === label),
  );
  const label = extras[0] ?? `T${rows.length + 1}`;
  return [
    ...rows,
    {
      id: nextId(),
      label,
      teams: [],
      color: paletteColorForLabel(label, rows.length),
    },
  ];
};

export const removeLastTier = (rows: TierRow[]): TierRow[] => {
  if (rows.length <= MIN_TIERS) {
    return rows;
  }
  return rows.slice(0, -1);
};

export const setTierLabel = (
  rows: TierRow[],
  index: number,
  label: string,
): TierRow[] => {
  if (index < 0 || index >= rows.length) {
    return rows;
  }
  const next = rows.slice();
  next[index] = {
    ...next[index]!,
    label: label.slice(0, TIER_LABEL_MAX_LENGTH),
  };
  return next;
};

export const setTierColor = (
  rows: TierRow[],
  index: number,
  color: string,
): TierRow[] => {
  if (index < 0 || index >= rows.length) {
    return rows;
  }
  const next = rows.slice();
  const parsed = parseTierColor(color);
  next[index] = {
    ...next[index]!,
    color: isDefaultTierColor(parsed) ? undefined : parsed,
  };
  return next;
};

/** Place a team on a row. If it already lives elsewhere, it moves. */
export const addTeamToRow = (
  rows: TierRow[],
  rowIndex: number,
  teamId: string,
): TierRow[] => {
  if (rowIndex < 0 || rowIndex >= rows.length) {
    return rows;
  }
  const stripped = rows.map((row, index) => {
    if (!row.teams.includes(teamId)) {
      return row;
    }
    if (index === rowIndex) {
      return row;
    }
    return { ...row, teams: row.teams.filter((id) => id !== teamId) };
  });
  const target = stripped[rowIndex]!;
  if (target.teams.includes(teamId)) {
    return stripped;
  }
  const next = stripped.slice();
  next[rowIndex] = { ...target, teams: [...target.teams, teamId] };
  return next;
};

export const removeTeamFromRow = (
  rows: TierRow[],
  rowIndex: number,
  teamId: string,
): TierRow[] => {
  if (rowIndex < 0 || rowIndex >= rows.length) {
    return rows;
  }
  const next = rows.slice();
  next[rowIndex] = {
    ...next[rowIndex]!,
    teams: next[rowIndex]!.teams.filter((id) => id !== teamId),
  };
  return next;
};

export const replaceTeamInRow = (
  rows: TierRow[],
  rowIndex: number,
  oldTeamId: string,
  newTeamId: string,
): TierRow[] => {
  if (rowIndex < 0 || rowIndex >= rows.length || !newTeamId) {
    return rows;
  }
  if (oldTeamId === newTeamId) {
    return rows;
  }
  const stripped = rows.map((row) =>
    row.teams.includes(newTeamId)
      ? { ...row, teams: row.teams.filter((id) => id !== newTeamId) }
      : row,
  );
  const target = stripped[rowIndex]!;
  const at = target.teams.indexOf(oldTeamId);
  if (at < 0) {
    return addTeamToRow(stripped, rowIndex, newTeamId);
  }
  const teams = target.teams.slice();
  teams[at] = newTeamId;
  const next = stripped.slice();
  next[rowIndex] = { ...target, teams };
  return next;
};

/** Insert a team at `toIndex` on `toRow`, moving it if it already lives elsewhere. */
export const placeTeamAt = (
  rows: TierRow[],
  toRow: number,
  toIndex: number,
  teamId: string,
): TierRow[] => {
  if (toRow < 0 || toRow >= rows.length || !teamId) {
    return rows;
  }
  const fromRow = rowIndexForTeam(rows, teamId);
  const fromIndex = fromRow >= 0 ? rows[fromRow]!.teams.indexOf(teamId) : -1;
  const stripped = rows.map((row) =>
    row.teams.includes(teamId)
      ? { ...row, teams: row.teams.filter((id) => id !== teamId) }
      : row,
  );
  const target = stripped[toRow]!;
  let insertAt = Math.max(0, Math.min(toIndex, target.teams.length + 1));
  if (fromRow === toRow && fromIndex >= 0 && fromIndex < insertAt) {
    insertAt -= 1;
  }
  insertAt = Math.max(0, Math.min(insertAt, target.teams.length));
  const teams = target.teams.slice();
  teams.splice(insertAt, 0, teamId);
  const next = stripped.slice();
  next[toRow] = { ...target, teams };
  return next;
};

export const usedLabelsForPicker = (
  rows: TierRow[],
  rowIndex: number,
  currentId?: string | null,
): Record<string, string> => {
  const labels: Record<string, string> = {};
  rows.forEach((row, index) => {
    for (const id of row.teams) {
      if (id === currentId) {
        labels[id] = "This slot";
      } else if (index === rowIndex) {
        labels[id] = "This row";
      } else {
        labels[id] = `On ${row.label || "row"}`;
      }
    }
  });
  return labels;
};

export const isTierDraft = (value: unknown): value is TierDraft =>
  Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as TierDraft).title === "string" &&
      isTierRows((value as TierDraft).rows),
  );

/** Placement from the product example (every NBA team once). */
export const EXAMPLE_TIER_PLACEMENT: { label: string; teams: string[] }[] = [
  { label: "S", teams: ["LAL"] },
  { label: "A", teams: ["CHI", "GSW", "NYK", "OKC", "MIA"] },
  { label: "B", teams: ["POR", "WAS", "IND", "DEN", "NOP", "SAC", "UTA"] },
  { label: "C", teams: ["BOS", "DAL", "TOR", "ORL", "SAS"] },
  { label: "D", teams: ["CHA", "MEM", "PHI", "ATL", "PHX"] },
  { label: "F", teams: ["BKN", "CLE", "HOU", "MIL", "DET", "MIN", "LAC"] },
];

export const createExampleRows = (): TierRow[] =>
  EXAMPLE_TIER_PLACEMENT.map((row, index) => ({
    id: `tier-${row.label.toLowerCase()}`,
    label: row.label,
    teams: row.teams.slice(),
    color: paletteColorForLabel(row.label, index),
  }));

export const splitTierTitle = (title: string): string[] =>
  splitBalancedTitle(title, DEFAULT_TIER_TITLE, 0.04);

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

export const exportTierFilename = (title: string) => {
  const stem = slugify(title) || "nba-tier-list";
  return `${stem}.png`;
};
