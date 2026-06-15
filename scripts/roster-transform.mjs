// Pure transforms used by fetch-roster.mjs, extracted so they can be unit
// tested without hitting the balldontlie API.

export const slug = (name) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// Map a coarse balldontlie position to a primary + secondary positions in our
// PG/SG/SF/PF/C model.
export function mapPositions(raw) {
  const pos = (raw || "").toUpperCase().replace(/\s/g, "");
  switch (pos) {
    case "PG": return ["PG", ["SG"]];
    case "SG": return ["SG", ["PG"]];
    case "SF": return ["SF", ["PF"]];
    case "PF": return ["PF", ["SF", "C"]];
    case "C": return ["C", ["PF"]];
    case "G": return ["PG", ["SG"]];
    case "G-F": return ["SG", ["SF"]];
    case "F-G": return ["SF", ["SG"]];
    case "F": return ["SF", ["PF"]];
    case "F-C": return ["PF", ["C"]];
    case "C-F": return ["C", ["PF"]];
    default: return [null, []];
  }
}

export const round = (value, places = 1) => {
  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function trueShooting(avg) {
  const denom = 2 * ((avg.fga ?? 0) + 0.44 * (avg.fta ?? 0));
  return denom > 0 ? (avg.pts ?? 0) / denom : 0;
}

// `usage` and `defense` are not provided by the feed, so they are approximated.
export function approxUsage(avg) {
  const possessions =
    (avg.fga ?? 0) + 0.44 * (avg.fta ?? 0) + (avg.turnover ?? 0);
  return clamp(round(8 + possessions * 1.25), 8, 40);
}

export function approxDefense(avg, big) {
  const stocks = (avg.stl ?? 0) + (avg.blk ?? 0) * 1.4;
  return clamp(round(5.5 + stocks * 1.3 + (big ? 0.7 : 0)), 4, 10);
}

export function statsFromAverage(avg, position) {
  const big = position === "C" || position === "PF";
  return {
    points: round(avg.pts ?? 0),
    rebounds: round(avg.reb ?? 0),
    assists: round(avg.ast ?? 0),
    steals: round(avg.stl ?? 0),
    blocks: round(avg.blk ?? 0),
    trueShooting: round(trueShooting(avg), 3),
    threePoint: round(avg.fg3_pct ?? 0, 3),
    usage: approxUsage(avg),
    defense: approxDefense(avg, big),
  };
}

export function deriveStyles(stats, position) {
  const big = position === "C" || position === "PF";
  const styles = [];
  if (stats.assists >= 5 || (stats.usage >= 28 && stats.assists >= 4)) {
    styles.push("engine");
  }
  if (stats.points >= 20) styles.push("scorer");
  if (stats.threePoint >= 0.37) styles.push("shooter");
  if (stats.assists >= 4 && !styles.includes("engine")) styles.push("connector");
  if (stats.defense >= 8) styles.push("stopper");
  if (stats.blocks >= 1.2 || (big && stats.blocks >= 0.9)) {
    styles.push("rim-protector");
  }
  if (big && stats.threePoint < 0.33) styles.push("roll-man");
  if (styles.length === 0) styles.push(big ? "roll-man" : "connector");
  return [...new Set(styles)].slice(0, 3);
}
