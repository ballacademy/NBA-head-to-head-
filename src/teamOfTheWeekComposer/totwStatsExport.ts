import { graphicCaption } from "../instagramComposer/graphicCaption";
import { exportFilenameFromTitle } from "../instagramComposer/composerPresets";
import {
  parseMadeAttempted,
  type NightStandout,
} from "../playerOfTheDayComposer/nightStandouts";
import { getPlayer } from "../tierListComposer/nbaActivePlayers";
import {
  PLUS_LINEUP_SLOTS,
  totwGames,
  totwShooting,
  type PlusLineupSlot,
} from "../teamOfTheWeekPlusComposer/teamOfTheWeekPlusState";
import { stripPlayerName, type TotwStrip } from "./teamOfTheWeekState";

export const TOTW_STATS_EMPTY = "—";
export const TOTW_STATS_NOTE = "Per game in this range";
export const TOTW_STATS_PLUS_TITLE = "WEEK STATS";

export const TOTW_STATS_FIELDS = [
  { key: "gp", label: "GP" },
  { key: "pts", label: "PTS" },
  { key: "reb", label: "REB" },
  { key: "ast", label: "AST" },
  { key: "stl", label: "STL" },
  { key: "blk", label: "BLK" },
  { key: "tpm", label: "3PM" },
  { key: "fgPct", label: "FG%" },
  { key: "tpPct", label: "3P%" },
  { key: "tsPct", label: "TS%" },
  { key: "efgPct", label: "eFG%" },
] as const;

export type TotwStatsFieldKey = (typeof TOTW_STATS_FIELDS)[number]["key"];

export interface TotwStatsRow {
  athleteId: string;
  slot: PlusLineupSlot;
  firstName: string;
  lastName: string;
  name: string;
  teamId: string | null;
  gp: string;
  pts: string;
  reb: string;
  ast: string;
  stl: string;
  blk: string;
  tpm: string;
  fgPct: string;
  tpPct: string;
  tsPct: string;
  efgPct: string;
}

export interface TotwStatsSection {
  id: "starters" | "standouts";
  caption: string;
  rows: TotwStatsRow[];
}

export interface TotwStatsSheet {
  brand: string;
  title: string;
  week: string;
  sections: TotwStatsSection[];
}

export const totwStatsSlot = (index: number): PlusLineupSlot =>
  PLUS_LINEUP_SLOTS[index % PLUS_LINEUP_SLOTS.length] ?? "PG";

export const formatTotwStatNumber = (value: number) => {
  if (!Number.isFinite(value)) {
    return TOTW_STATS_EMPTY;
  }
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
};

export const formatTotwStatPct = (value: number | null | undefined) => {
  if (value == null || !Number.isFinite(value)) {
    return TOTW_STATS_EMPTY;
  }
  const pct = value <= 1 ? value * 100 : value;
  const rounded = Math.round(pct * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`;
};

const ratioPct = (made: number, attempted: number) =>
  attempted > 0 ? formatTotwStatPct(made / attempted) : TOTW_STATS_EMPTY;

const emptyStatLine = (): Pick<
  TotwStatsRow,
  TotwStatsFieldKey
> => ({
  gp: TOTW_STATS_EMPTY,
  pts: TOTW_STATS_EMPTY,
  reb: TOTW_STATS_EMPTY,
  ast: TOTW_STATS_EMPTY,
  stl: TOTW_STATS_EMPTY,
  blk: TOTW_STATS_EMPTY,
  tpm: TOTW_STATS_EMPTY,
  fgPct: TOTW_STATS_EMPTY,
  tpPct: TOTW_STATS_EMPTY,
  tsPct: TOTW_STATS_EMPTY,
  efgPct: TOTW_STATS_EMPTY,
});

export const totwStatsFromStandout = (row: NightStandout) => {
  const stats = row.game.stats;
  const shooting = totwShooting(stats);
  const three = parseMadeAttempted(stats.three);
  return {
    gp: String(totwGames(row)),
    pts: stats.pts || TOTW_STATS_EMPTY,
    reb: stats.reb || TOTW_STATS_EMPTY,
    ast: stats.ast || TOTW_STATS_EMPTY,
    stl: stats.stl || TOTW_STATS_EMPTY,
    blk: stats.blk || TOTW_STATS_EMPTY,
    tpm: formatTotwStatNumber(three.made),
    fgPct: ratioPct(shooting.fg.made, shooting.fg.attempted),
    tpPct: ratioPct(shooting.three.made, shooting.three.attempted),
    tsPct: formatTotwStatPct(shooting.ts),
    efgPct: formatTotwStatPct(shooting.efg),
  };
};

export const totwStatsRowForStrip = (
  strip: TotwStrip,
  index: number,
  weekRows: readonly NightStandout[],
): TotwStatsRow | null => {
  if (!strip.playerId) {
    return null;
  }
  const player = getPlayer(strip.playerId);
  const week = weekRows.find((row) => row.athleteId === strip.playerId);
  const name = stripPlayerName(strip) || player?.name || strip.playerId;
  return {
    athleteId: strip.playerId,
    slot: totwStatsSlot(index),
    firstName: strip.firstName,
    lastName: strip.lastName,
    name,
    teamId: strip.teamId,
    ...(week ? totwStatsFromStandout(week) : emptyStatLine()),
  };
};

const rowsFromStrips = (
  strips: readonly TotwStrip[],
  weekRows: readonly NightStandout[],
) =>
  strips
    .map((strip, index) => totwStatsRowForStrip(strip, index, weekRows))
    .filter((row): row is TotwStatsRow => Boolean(row));

export const buildTotwStatsSheet = (input: {
  brand: string;
  title: string;
  week: string;
  strips: readonly TotwStrip[];
  weekRows: readonly NightStandout[];
}): TotwStatsSheet => ({
  brand: input.brand,
  title: input.title.trim() || "TEAM OF THE WEEK",
  week: input.week,
  sections: [
    {
      id: "starters",
      caption: input.title.trim() || "TEAM OF THE WEEK",
      rows: rowsFromStrips(input.strips, input.weekRows),
    },
  ],
});

export const buildPlusStatsSheet = (input: {
  brand: string;
  week: string;
  starterCaption: string;
  standoutCaption: string;
  slots: readonly TotwStrip[];
  weekRows: readonly NightStandout[];
}): TotwStatsSheet => ({
  brand: input.brand,
  title: TOTW_STATS_PLUS_TITLE,
  week: input.week,
  sections: [
    {
      id: "starters",
      caption: input.starterCaption.trim() || "TEAM OF THE WEEK",
      rows: rowsFromStrips(input.slots.slice(0, 5), input.weekRows),
    },
    {
      id: "standouts",
      caption: input.standoutCaption.trim() || "STANDOUTS OF THE WEEK",
      rows: rowsFromStrips(input.slots.slice(5, 10), input.weekRows),
    },
  ],
});

export const totwStatsHasRows = (sheet: TotwStatsSheet) =>
  sheet.sections.some((section) => section.rows.length > 0);

export const totwStatsFieldValue = (
  row: TotwStatsRow,
  key: TotwStatsFieldKey,
) => row[key];

const csvCell = (value: string) => {
  if (/[",\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
};

export const totwStatsCsv = (sheet: TotwStatsSheet) => {
  const header = [
    "Section",
    "Slot",
    "Player",
    "Team",
    ...TOTW_STATS_FIELDS.map((field) => field.label),
  ];
  const lines = [header.join(",")];
  for (const section of sheet.sections) {
    for (const row of section.rows) {
      lines.push(
        [
          section.caption,
          row.slot,
          row.name,
          row.teamId ?? "",
          ...TOTW_STATS_FIELDS.map((field) => totwStatsFieldValue(row, field.key)),
        ]
          .map(csvCell)
          .join(","),
      );
    }
  }
  return lines.join("\n");
};

export const totwStatsCaption = (sheet: TotwStatsSheet) => {
  const extra = [sheet.week, TOTW_STATS_NOTE];
  for (const section of sheet.sections) {
    extra.push("");
    extra.push(section.caption);
    for (const row of section.rows) {
      extra.push(
        [
          row.slot,
          row.name,
          `${row.gp} GP`,
          `${row.pts}/${row.reb}/${row.ast}`,
          `${row.stl} STL`,
          `${row.blk} BLK`,
          `${row.tpm} 3PM`,
          `${row.fgPct} FG`,
          `${row.tpPct} 3P`,
          `${row.tsPct} TS`,
          `${row.efgPct} eFG`,
        ].join("  "),
      );
    }
  }
  return graphicCaption(sheet.title, [], extra);
};

export const totwStatsCsvFilename = (sheet: TotwStatsSheet) =>
  exportFilenameFromTitle(sheet.title, "totw-week-stats", sheet.week).replace(
    /\.png$/i,
    ".csv",
  );

export const totwStatsPngFilename = (
  sheet: TotwStatsSheet,
  story = false,
) =>
  exportFilenameFromTitle(
    sheet.title,
    "totw-week-stats",
    sheet.week,
    story,
  );

export const downloadTotwStatsCsv = (sheet: TotwStatsSheet) => {
  const csv = `\uFEFF${totwStatsCsv(sheet)}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.download = totwStatsCsvFilename(sheet);
    link.href = objectUrl;
    link.click();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
  }
};
