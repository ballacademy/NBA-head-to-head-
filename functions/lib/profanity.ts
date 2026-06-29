const LEET_REPLACEMENTS: Array<[string, string]> = [
  ["0", "o"],
  ["1", "i"],
  ["3", "e"],
  ["4", "a"],
  ["5", "s"],
  ["7", "t"],
  ["@", "a"],
  ["$", "s"],
];

const BLOCKED_SUBSTRINGS = [
  "fuck",
  "shit",
  "bitch",
  "cunt",
  "dick",
  "cock",
  "pussy",
  "whore",
  "slut",
  "nigger",
  "nigga",
  "faggot",
  "retard",
  "kike",
  "chink",
  "spic",
  "wetback",
  "porn",
  "nazi",
  "hitler",
] as const;

const BLOCKED_WHOLE_WORDS = [
  "ass",
  "damn",
  "hell",
  "crap",
  "fag",
] as const;

const normalizeForProfanityCheck = (value: string) => {
  let normalized = value.toLowerCase();

  for (const [from, to] of LEET_REPLACEMENTS) {
    normalized = normalized.replaceAll(from, to);
  }

  return normalized;
};

const compactAlphaNumeric = (value: string) =>
  normalizeForProfanityCheck(value).replace(/[^a-z0-9]/g, "");

const tokenizeForProfanityCheck = (value: string) =>
  normalizeForProfanityCheck(value)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

export const containsProfanity = (value: string) => {
  if (!value.trim()) {
    return false;
  }

  const compact = compactAlphaNumeric(value);
  const tokens = new Set(tokenizeForProfanityCheck(value));

  return (
    BLOCKED_SUBSTRINGS.some((term) => compact.includes(term)) ||
    BLOCKED_WHOLE_WORDS.some((term) => tokens.has(term))
  );
};

export const rejectProfaneTeamName = (teamName: string) =>
  containsProfanity(teamName)
    ? "team name contains offensive language"
    : null;
