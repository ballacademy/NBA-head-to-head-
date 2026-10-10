export const MIN_TIERS = 3;
export const MAX_TIERS = 10;
export const DEFAULT_TIER_LABELS = ["S", "A", "B", "C", "D", "F"] as const;
export const EXTRA_TIER_LABELS = ["G", "H", "I", "J"] as const;
export const DEFAULT_TIER_TITLE = "GUESS THE NBA TIER LIST";

export interface TierRow {
  id: string;
  label: string;
  teams: string[];
}

export interface TierDraft {
  title: string;
  rows: TierRow[];
}

const nextId = () =>
  `tier-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export const createDefaultRows = (): TierRow[] =>
  DEFAULT_TIER_LABELS.map((label) => ({
    id: `tier-${label.toLowerCase()}`,
    label,
    teams: [],
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
  return [...rows, { id: nextId(), label, teams: [] }];
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
  next[index] = { ...next[index]!, label: label.slice(0, 8).toUpperCase() };
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
  EXAMPLE_TIER_PLACEMENT.map((row) => ({
    id: `tier-${row.label.toLowerCase()}`,
    label: row.label,
    teams: row.teams.slice(),
  }));

export const splitTierTitle = (title: string): string[] => {
  const text = title.trim().toUpperCase() || DEFAULT_TIER_TITLE;
  if (text.endsWith("TIER LIST") && text.length > "TIER LIST".length) {
    const head = text.slice(0, -"TIER LIST".length).trim();
    return head ? [head, "TIER LIST"] : [text];
  }
  return [text];
};

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
