import type { PlayStyle, Player, Position } from "../lib/types";

// Rotation players beyond the detailed "featured" stars. Team/position/division
// placement reflects the app's June-2026 timeline; per-game stats are generated
// deterministically (illustrative, not a verified feed) so the file stays
// maintainable while the division/position draft pools are well populated.

const STYLE_BY_POSITION: Record<Position, PlayStyle[]> = {
  PG: ["engine", "connector"],
  SG: ["scorer", "shooter"],
  SF: ["scorer", "stopper"],
  PF: ["roll-man", "rim-protector"],
  C: ["rim-protector", "roll-man"],
};

const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// Small deterministic PRNG (mulberry32 over an FNV-1a hash of the seed).
const seeded = (seed: string) => {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return () => {
    hash += 0x6d2b79f5;
    let value = hash;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

const generateStats = (rng: () => number, position: Position) => {
  const rand = (min: number, max: number) => min + rng() * (max - min);
  const r1 = (value: number) => Math.round(value * 10) / 10;
  const r3 = (value: number) => Math.round(value * 1000) / 1000;
  const guard = position === "PG" || position === "SG";
  const big = position === "C" || position === "PF";

  return {
    points: r1(rand(7, 19)),
    rebounds: r1(big ? rand(5.5, 11) : guard ? rand(2.5, 5) : rand(3.5, 7)),
    assists: r1(
      position === "PG" ? rand(4, 8) : guard ? rand(2.5, 5) : rand(1.5, 3.5),
    ),
    steals: r1(rand(0.5, 1.5)),
    blocks: r1(big ? rand(0.6, 1.8) : rand(0.2, 0.7)),
    trueShooting: r3(rand(0.54, 0.61)),
    threePoint: r3(position === "C" ? rand(0, 0.34) : rand(0.33, 0.4)),
    usage: r1(rand(15, 25)),
    defense: r1(rand(6, 8.5)),
  };
};

const p = (
  name: string,
  team: string,
  position: Position,
  secondaryPositions?: Position[],
): Player => {
  const id = slug(name);
  return {
    id,
    name,
    team,
    position,
    ...(secondaryPositions ? { secondaryPositions } : {}),
    styles: STYLE_BY_POSITION[position],
    ...generateStats(seeded(id), position),
  };
};

export const rotationPlayers: Player[] = [
  // Atlantic Division
  p("Payton Pritchard", "BOS", "SG", ["PG"]),
  p("Cam Thomas", "BKN", "SG", ["PG"]),
  p("Nic Claxton", "BKN", "C"),
  p("Michael Porter Jr", "BKN", "SF", ["PF"]),
  p("Mitchell Robinson", "NYK", "C"),
  p("Josh Hart", "NYK", "SG", ["SF"]),
  p("Tyrese Maxey", "PHI", "PG"),
  p("Quentin Grimes", "PHI", "SG", ["SF"]),
  p("VJ Edgecombe", "PHI", "SG", ["PG"]),
  p("Scottie Barnes", "TOR", "SF", ["PF"]),
  p("Immanuel Quickley", "TOR", "PG"),
  p("RJ Barrett", "TOR", "SG", ["SF"]),
  p("Jakob Poeltl", "TOR", "C"),
  p("Brandon Ingram", "TOR", "SF", ["PF"]),

  // Central Division
  p("Cade Cunningham", "DET", "PG"),
  p("Jalen Duren", "DET", "C"),
  p("Jaden Ivey", "DET", "SG", ["PG"]),
  p("Ausar Thompson", "DET", "SF", ["PF"]),
  p("Tobias Harris", "DET", "PF", ["SF"]),
  p("Darius Garland", "CLE", "PG"),
  p("Evan Mobley", "CLE", "PF", ["C"]),
  p("Jarrett Allen", "CLE", "C"),
  p("Max Strus", "CLE", "SF", ["SG"]),
  p("De'Andre Hunter", "CLE", "SF", ["PF"]),
  p("Coby White", "CHI", "SG", ["PG"]),
  p("Josh Giddey", "CHI", "PG", ["SF"]),
  p("Nikola Vucevic", "CHI", "C"),
  p("Matas Buzelis", "CHI", "SF", ["PF"]),
  p("Pascal Siakam", "IND", "PF", ["SF"]),
  p("Bennedict Mathurin", "IND", "SG", ["SF"]),
  p("Andrew Nembhard", "IND", "PG", ["SG"]),
  p("Aaron Nesmith", "IND", "SF"),
  p("Myles Turner", "MIL", "C", ["PF"]),
  p("Bobby Portis", "MIL", "PF", ["C"]),
  p("Kyle Kuzma", "MIL", "SF", ["PF"]),
  p("Gary Trent Jr", "MIL", "SG"),

  // Southeast Division
  p("Trae Young", "ATL", "PG"),
  p("Jalen Johnson", "ATL", "PF", ["SF"]),
  p("Dyson Daniels", "ATL", "SG", ["PG"]),
  p("Onyeka Okongwu", "ATL", "C", ["PF"]),
  p("Zaccharie Risacher", "ATL", "SF"),
  p("Kristaps Porzingis", "GSW", "C", ["PF"]),
  p("LaMelo Ball", "CHA", "PG"),
  p("Brandon Miller", "CHA", "SF", ["SG"]),
  p("Miles Bridges", "CHA", "PF", ["SF"]),
  p("Tyler Herro", "MIA", "SG", ["PG"]),
  p("Andrew Wiggins", "MIA", "SF", ["PF"]),
  p("Norman Powell", "MIA", "SG"),
  p("Kel'el Ware", "MIA", "C", ["PF"]),
  p("Paolo Banchero", "ORL", "PF", ["SF"]),
  p("Franz Wagner", "ORL", "SF", ["PF"]),
  p("Jalen Suggs", "ORL", "PG", ["SG"]),
  p("Wendell Carter Jr", "ORL", "C"),
  p("Anthony Black", "ORL", "PG", ["SG"]),
  p("Alex Sarr", "WAS", "C", ["PF"]),
  p("Bilal Coulibaly", "WAS", "SF", ["SG"]),
  p("Bub Carrington", "WAS", "PG", ["SG"]),

  // Northwest Division
  p("Jamal Murray", "DEN", "PG"),
  p("Christian Braun", "DEN", "SG", ["SF"]),
  p("Cameron Johnson", "DEN", "SF", ["PF"]),
  p("Peyton Watson", "DEN", "SF", ["PF"]),
  p("Jalen Williams", "OKC", "SF", ["SG"]),
  p("Luguentz Dort", "OKC", "SG", ["SF"]),
  p("Isaiah Hartenstein", "OKC", "C"),
  p("Cason Wallace", "OKC", "PG", ["SG"]),
  p("Julius Randle", "MIN", "PF", ["SF"]),
  p("Jaden McDaniels", "MIN", "SF", ["PF"]),
  p("Mike Conley", "MIN", "PG"),
  p("Donte DiVincenzo", "MIN", "SG", ["PG"]),
  p("Naz Reid", "MIN", "C", ["PF"]),
  p("Scoot Henderson", "POR", "PG"),
  p("Shaedon Sharpe", "POR", "SG"),
  p("Deni Avdija", "POR", "SF", ["PF"]),
  p("Donovan Clingan", "POR", "C"),
  p("Jerami Grant", "POR", "SF", ["PF"]),
  p("Walker Kessler", "UTA", "C"),
  p("Keyonte George", "UTA", "PG", ["SG"]),
  p("Isaiah Collier", "UTA", "PG"),
  p("Taylor Hendricks", "UTA", "PF", ["SF"]),

  // Pacific Division
  p("Jimmy Butler", "GSW", "SF", ["PF"]),
  p("Draymond Green", "GSW", "PF", ["C"]),
  p("Brandin Podziemski", "GSW", "SG", ["PG"]),
  p("Moses Moody", "GSW", "SG", ["SF"]),
  p("James Harden", "LAC", "PG"),
  p("Ivica Zubac", "LAC", "C"),
  p("Derrick Jones Jr", "LAC", "SF", ["PF"]),
  p("Kris Dunn", "LAC", "PG", ["SG"]),
  p("John Collins", "LAC", "PF", ["C"]),
  p("Austin Reaves", "LAL", "SG", ["PG"]),
  p("Rui Hachimura", "LAL", "PF", ["SF"]),
  p("Deandre Ayton", "LAL", "C"),
  p("Jalen Green", "PHX", "SG"),
  p("Dillon Brooks", "PHX", "SF", ["SG"]),
  p("Grayson Allen", "PHX", "SG"),
  p("Nick Richards", "PHX", "C"),
  p("DeMar DeRozan", "SAC", "SF", ["PF"]),
  p("Zach LaVine", "SAC", "SG", ["SF"]),
  p("Keegan Murray", "SAC", "SF", ["PF"]),
  p("Malik Monk", "SAC", "PG", ["SG"]),
  p("Keon Ellis", "SAC", "SG", ["PG"]),

  // Southwest Division
  p("Cooper Flagg", "DAL", "SF", ["PF"]),
  p("Klay Thompson", "DAL", "SG"),
  p("Daniel Gafford", "DAL", "C"),
  p("PJ Washington", "DAL", "PF", ["SF"]),
  p("Dereck Lively II", "DAL", "C"),
  p("Alperen Sengun", "HOU", "C"),
  p("Amen Thompson", "HOU", "SF", ["PG"]),
  p("Fred VanVleet", "HOU", "PG"),
  p("Jabari Smith Jr", "HOU", "PF", ["C"]),
  p("Tari Eason", "HOU", "SF", ["PF"]),
  p("Ja Morant", "MEM", "PG"),
  p("Jaren Jackson Jr", "MEM", "PF", ["C"]),
  p("Zach Edey", "MEM", "C"),
  p("Jaylen Wells", "MEM", "SF", ["SG"]),
  p("Scotty Pippen Jr", "MEM", "PG", ["SG"]),
  p("Zion Williamson", "NOP", "PF", ["SF"]),
  p("Trey Murphy III", "NOP", "SF", ["SG"]),
  p("Herbert Jones", "NOP", "SF", ["PF"]),
  p("Dejounte Murray", "NOP", "PG", ["SG"]),
  p("Jordan Poole", "NOP", "SG", ["PG"]),
  p("Yves Missi", "NOP", "C"),
  p("De'Aaron Fox", "SAS", "PG"),
  p("Stephon Castle", "SAS", "SG", ["PG"]),
  p("Devin Vassell", "SAS", "SG", ["SF"]),
  p("Harrison Barnes", "SAS", "SF", ["PF"]),
  p("Jeremy Sochan", "SAS", "PF", ["C"]),
  p("Dylan Harper", "SAS", "SG", ["PG"]),
];
